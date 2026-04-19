require("dotenv").config()
require("dns").setDefaultResultOrder("ipv4first");
const express = require("express")
const connectDB = require("./config/db")
const allEmployeeModel = require("./models/allEmployeeSchema")
const bcrypt = require("bcrypt")
const { sendMailServices, sendLeaveStatusEmail } = require("./services/mailservices")
const passwordValidation = require("./utils/passwordValidation")
const otpService = require("./utils/otpGeneration")
const sendOTPServices = require("./services/otpServices")
const otpModel = require("./models/otpSchema")
const geofenceModel = require("./models/geofenceSchema")
const alertModel = require("./models/alertSchema")
const locationLogModel = require("./models/locationLogSchema")
const updateRequestModel = require("./models/updateRequestSchema")
const leaveRequestModel = require("./models/leaveRequestSchema")
const sendBreachAlertEmail = require("./services/breachmailservice")
const cors = require("cors")
const compression = require("compression")
// ─── Security Packages ─────────────────────────────────────────────────────────
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const mongoSanitize = require("express-mongo-sanitize")
const cookieParser = require("cookie-parser")
const jwt = require("jsonwebtoken")
const authMiddleware = require("./middleware/auth")
const app = express()

// REQUIRED for Render/Heroku/any reverse proxy
// Without this, express-rate-limit crashes because Render adds X-Forwarded-For headers
// but Express doesn't know to trust them — causing a validation mismatch on every request
app.set('trust proxy', 1)

// ─── Security Middleware ────────────────────────────────────────────────────────
// 1. Helmet — sets 15+ secure HTTP headers (XSS, clickjacking, MIME sniffing, etc.)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },  // allow map tiles & images
  contentSecurityPolicy: false,                            // disable for React SPA compatibility
}))

// 2. Global rate limiter — 200 requests per 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }, // disable proxy validation — handled via trust proxy above
  message: { message: "Too many requests. Please slow down." },
})
app.use(globalLimiter)

// Specific limiters for sensitive auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts. Please wait 15 minutes before trying again." },
})
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many registration attempts from this IP." },
})
const breachLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many breach triggers." },
})

app.use(compression()) // gzip all responses
app.use(express.json({ limit: '10kb' }))  // limit body size to 10KB

// 3. NoSQL injection sanitization — strips $ and .
// Custom middleware used instead of app.use(mongoSanitize()) because Express 5 makes req.query read-only
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  // Skip req.query to prevent Express 5 crashing
  next();
});

// 4. Cookie parser — needed to read httpOnly JWT cookies
app.use(cookieParser())

app.use(cors({
  origin: [
    "https://secure-track-theta.vercel.app",
    "http://localhost:5173"
  ],
  credentials: true
}));

// 5. Protect ALL /api/admin/* routes with JWT cookie auth
app.use("/api/admin", authMiddleware)

connectDB()

// Health check for Render
app.get("/", (req, res) => res.status(200).json({ status: "ok" }));

app.post("/register", registerLimiter, async (req, res) => {

  const employee = req.body
  try {

    const isvalid = passwordValidation(employee.password)
    if(!isvalid) {
      return res.status(401).json({message: " at least one lowercase letter is present in the string and at least one uppercase letter is present. and  at least one digit (0-9) is present. and at least one special character from the specified set is present. and  minimum length of 8 characters"})
    }
    const hashedPassword = await bcrypt.hash(employee.password, parseInt(process.env.SALT_ROUNDS) || 10)

    // ── KEY FIX: frontend sends `employeeId` (lowercase e) but schema requires `EmployeeId` (capital E)
    // Spreading req.body directly caused a Mongoose "EmployeeId is required" validation error every time
    const data = await allEmployeeModel.create({
      name:       employee.name,
      email:      employee.email,
      password:   hashedPassword,
      EmployeeId: employee.employeeId,  // map the field name correctly
      role:       employee.role,
    });

    console.log("New employee registered:", data.name, "| Role:", data.role);
    res.status(201).json({ message: "Account Created" });
    sendMailServices(employee.email, "Registration Successfully", employee.name).catch(console.error);

  } catch (error) {
    console.log("Registration error:", error.message);
    if (!res.headersSent) {
      if (error.code === 11000) {
        // MongoDB duplicate key — email already exists
        return res.status(409).json({ message: "This email is already registered. Please log in instead." });
      }
      res.status(500).json({ message: "Registration failed: " + error.message });
    }
  }
})


app.post("/login", authLimiter, async (req, res) => {
  const {email, password} = req.body
  try {
    const employee = await allEmployeeModel.findOne({email})
    if(!employee) {
      return res.status(404).json({message: "Email not Registered!"})
    }

    // ── Account Lockout Check ────────────────────────────────────────────────
    if (employee.lockUntil && employee.lockUntil > new Date()) {
      const remaining = Math.ceil((employee.lockUntil - new Date()) / 60000);
      return res.status(423).json({
        message: `Account locked due to too many failed attempts. Try again in ${remaining} minute(s).`
      });
    }

    const match = await bcrypt.compare(password, employee.password)
    if(!match) {
      // Increment failed attempts
      const newAttempts = (employee.failedLoginAttempts || 0) + 1;
      const updateFields = { failedLoginAttempts: newAttempts };

      if (newAttempts >= 5) {
        // Lock the account for 15 minutes
        updateFields.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        updateFields.failedLoginAttempts = 0;
        await allEmployeeModel.findByIdAndUpdate(employee._id, { $set: updateFields });
        return res.status(423).json({
          message: "Account locked for 15 minutes due to 5 failed login attempts."
        });
      }

      await allEmployeeModel.findByIdAndUpdate(employee._id, { $set: updateFields });
      const attemptsLeft = 5 - newAttempts;
      return res.status(401).json({
        message: `Incorrect password. ${attemptsLeft} attempt(s) remaining before account lockout.`
      })
    }

    // ── Success — reset lockout counters ─────────────────────────────────────
    await allEmployeeModel.findByIdAndUpdate(employee._id, {
      $set: { failedLoginAttempts: 0, lockUntil: null }
    });
    console.log(employee.name);

    const OTP = String(otpService());

    if(!OTP) {
      return res.status(500).json({message: "Failed to send OTP"})
    }

    sendOTPServices(email, `OTP send Sucessfully ${employee.name}`, OTP).catch(console.error);

    const hashedOTP = await bcrypt.hash(OTP, 6)

    await otpModel.create({otp: hashedOTP, userId: employee._id})

    res.status(200).json({message: "OTP send Sucessfully."})

  } catch (error) {
    console.log(error);
    return res.status(500).json({message: "Internal Server Error."})
  }
})

app.post("/verify-otp", authLimiter, async (req, res) => {
  const {email, otp} = req.body;

  try {
    if(!email || !otp) {
      return res.status(400).json({message: "Email and OTP are Required"})
    }

    const employee = await allEmployeeModel.findOne({email})
    if(!employee) {
      return res.status(404).json({message: "User not Found.."})
    }
    const OTPDoc = await otpModel.findOne({userId: employee._id }).sort({ _id: -1 });
    if(!OTPDoc) {
      return res.status(400).json({message: "Otp-Expires"})
    }
    const verifyOTP = await bcrypt.compare(otp, OTPDoc.otp)

    if(!verifyOTP) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." })
    }

    // ── Sign JWT and set httpOnly secure cookie ───────────────────────────────
    const token = jwt.sign(
      { userId: employee._id, email: employee.email, role: employee.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.cookie("token", token, {
      httpOnly: true,   // JS cannot read this cookie — XSS safe
      secure: true,     // HTTPS only (required for SameSite:none)
      sameSite: "none", // cross-origin: Vercel → Render
      maxAge: 8 * 60 * 60 * 1000, // 8 hours in ms
    });

    return res.status(200).json({ 
      message: "Login Successful!",
      user: {
        name: employee.name,
        role: employee.role,
        email: employee.email
      }
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
})

// ─── Logout — clears the httpOnly JWT cookie ──────────────────────────────────
app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.status(200).json({ message: "Logged out successfully" });
});
app.get("/employees", async (req, res) => {
  try {
    const employees = await allEmployeeModel.find({}).select("-password"); // do not send passwords
    res.status(200).json(employees);
  } catch (error) {
    console.log(error);
    res.status(500).json({message: "Failed to fetch employees"});
  }
});

// Geofence API
app.get("/geofence", async (req, res) => {
  try {
    let geofence = await geofenceModel.findOne({ name: "Master" });
    if (!geofence) {
      // Create default if it doesn't exist
      geofence = await geofenceModel.create({
        name: "Master",
        lat: 20.3401499781858,
        lng: 85.80771980170387,
        radius: 200
      });
    }
    res.status(200).json(geofence);
  } catch (error) {
    console.log(error);
    res.status(500).json({message: "Failed to fetch geofence"});
  }
});

app.post("/geofence", async (req, res) => {
  try {
    const { lat, lng, radius } = req.body;
    let geofence = await geofenceModel.findOne({ name: "Master" });
    if (geofence) {
      geofence.lat = lat;
      geofence.lng = lng;
      geofence.radius = radius;
      await geofence.save();
    } else {
      geofence = await geofenceModel.create({ name: "Master", lat, lng, radius });
    }
    res.status(200).json(geofence);
  } catch (error) {
    console.log(error);
    res.status(500).json({message: "Failed to update geofence"});
  }
});

// --- NEW GEOFENCE SECURITY & TRACKING API ENDPOINTS ---

// 1. Employee posts their real-time location
app.post("/api/location", async (req, res) => {
  try {
    const { email, lat, lng, status, punchInTime, punchInLocation } = req.body;
    if (!email || !lat || !lng) return res.status(400).json({message: "Missing parameters"});
    
    const employee = await allEmployeeModel.findOne({email});
    if (!employee) return res.status(404).json({message: "User not found"});

    // Update or create location log for this employee
    let log = await locationLogModel.findOne({ userEmail: email });
    if (log) {
      log.lat = lat;
      log.lng = lng;
      log.status = status || log.status;
      if (punchInTime) log.punchInTime = punchInTime;
      if (punchInLocation) log.punchInLocation = punchInLocation;
      await log.save();
    } else {
      await locationLogModel.create({
        userEmail: email,
        userName: employee.name,
        userRole: employee.role,
        lat, lng, 
        status: status || "Inside",
        punchInTime: punchInTime || "Not Punched",
        punchInLocation: punchInLocation || "Unknown"
      });
    }
    res.status(200).json({message: "Location updated"});
  } catch (error) {
    console.error(error);
    res.status(500).json({message: "Server Error"});
  }
});

// ─── Breach Protection (rate-limited) ───────────────────────────────────────
app.post("/api/breach-trigger", breachLimiter, async (req, res) => {
  try {
    const { email, lat, lng } = req.body;
    if (!email) return res.status(400).json({message: "Email required"});

    const employee = await allEmployeeModel.findOne({email});
    if (!employee) return res.status(404).json({message: "User not found"});

    // Check if there's already an active 'Pending' alert
    const existingAlert = await alertModel.findOne({ userEmail: email, status: "Pending" });
    if (existingAlert) {
      // Check if it's expired
      if (new Date() > existingAlert.expiresAt) {
        existingAlert.status = "Alarm";
        existingAlert.detail = "OTP Verification Timeout";
        await existingAlert.save();
      } else {
        return res.status(200).json({ message: "Alert already pending", alertId: existingAlert._id, expiresAt: existingAlert.expiresAt });
      }
    }

    // Generate new OTP
    const OTP = String(otpService());
    console.log(`[BREACH] OTP for ${employee.name} is ${OTP}`);
    
    // Hash and store OTP
    const hashedOTP = await bcrypt.hash(OTP, 6);
    await otpModel.create({ otp: hashedOTP, userId: employee._id });

    // Send dedicated breach security alert email with GPS location & OTP
    sendBreachAlertEmail(email, employee.name, OTP, lat || 0, lng || 0).catch(console.error);

    // Create tracking Alert
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    const newAlert = await alertModel.create({
      userId: employee._id,
      userEmail: email,
      userName: employee.name,
      lat, lng,
      expiresAt: expires,
      status: "Pending",
      detail: "OTP verification required."
    });

    res.status(200).json({ message: "OTP sent and breach registered", alertId: newAlert._id, expiresAt: expires });
  } catch (error) {
    console.error(error);
    res.status(500).json({message: "Server Error"});
  }
});

// 3. Verify breach OTP
app.post("/api/verify-breach", async (req, res) => {
  try {
    const { email, otp, alertId } = req.body;
    if (!email || !otp) return res.status(400).json({message: "Email and OTP required"});

    const employee = await allEmployeeModel.findOne({email});
    if (!employee) return res.status(404).json({message: "User not found"});

    const OTPDoc = await otpModel.findOne({userId: employee._id }).sort({ _id: -1 });
    if (!OTPDoc) return res.status(400).json({message: "OTP Expired"});

    const verifyOTP = await bcrypt.compare(otp, OTPDoc.otp);
    if (!verifyOTP) return res.status(400).json({message: "Invalid OTP"});

    // Resolve the alert
    if (alertId) {
      const alert = await alertModel.findById(alertId);
      if (alert) {
        alert.status = "Resolved";
        alert.detail = "OTP verified successfully.";
        await alert.save();
      }
    } else {
      // Find latest pending if no explicit ID passed
      const alert = await alertModel.findOne({ userEmail: email }).sort({ _id: -1 });
      if (alert && alert.status === "Pending") {
         alert.status = "Resolved";
         alert.detail = "OTP verified successfully.";
         await alert.save();
      }
    }

    res.status(200).json({ message: "Breach Verified & Cleared" });
  } catch (error) {
    console.error(error);
    res.status(500).json({message: "Server Error"});
  }
});

// 4. Admin GET live locations
app.get("/api/admin/employee-locations", async (req, res) => {
  try {
    const locations = await locationLogModel.find({});
    // Convert to structure expected by frontend map
    const mapped = locations.map(l => ({
      id: l.userEmail,
      name: l.userName,
      role: l.userRole,
      lat: l.lat,
      lng: l.lng,
      status: l.status,
      punchIn: l.punchInTime || "-",
      location: l.punchInLocation || "-"
    }));
    res.status(200).json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({message: "Server Error"});
  }
});

// 5. Admin GET live alerts
app.get("/api/admin/alerts", async (req, res) => {
  try {
    const alerts = await alertModel.find({}).sort({ createdAt: -1 });
    
    // Auto-escalate expired pendings
    const now = new Date();
    for (let alert of alerts) {
       if (alert.status === "Pending" && now > alert.expiresAt) {
          alert.status = "Alarm";
          alert.detail = "OTP Verification Timeout";
          await alert.save();
       }
    }
    
    // Read mapped
    const mappedAlerts = alerts.map(a => {
       // calculate remaining seconds
       const remaining = a.expiresAt ? Math.max(0, Math.floor((new Date(a.expiresAt) - new Date()) / 1000)) : 0;
       
       let type = "alarm";
       if (a.status === "Resolved") type = "resolved";
       else if (a.status === "Alarm") type = "alarm";

       return {
         id: a._id.toString(),
         type: type,
         status: a.status,
         user: a.userName || "Unknown",
         empId: a.userEmail,
         event: a.eventType || "Geofence Breach",
         detail: a.detail,
         countdown: remaining,
         read: a.status !== "Alarm",
         createdAt: a.createdAt
       };
    });
    
    res.status(200).json(mappedAlerts);
  } catch (error) {
    console.error(error);
    res.status(500).json({message: "Server Error"});
  }
});

// 5b. Admin resolves an alert
app.put("/api/admin/alerts/:id/resolve", async (req, res) => {
  try {
    const alert = await alertModel.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: "Alert not found" });
    alert.status = "Resolved";
    alert.detail = "Manually resolved by admin.";
    await alert.save();
    res.status(200).json({ message: "Alert resolved" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 6. Admin stats
app.get("/api/admin/stats", async (req, res) => {
  try {
    const totalEmployees = await allEmployeeModel.countDocuments({});
    const totalGeofences = await geofenceModel.countDocuments({ active: true });
    
    // OTPs sent today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const otpSentToday = await otpModel.countDocuments({ createdAt: { $gte: startOfToday } });
    
    // Active location logs (employees who sent location)
    const activeDevices = await locationLogModel.countDocuments({});
    
    // Active breaches
    const activeBreaches = await alertModel.countDocuments({ status: "Alarm" });
    
    res.status(200).json({
      totalEmployees,
      totalGeofences,
      otpSentToday,
      activeDevices,
      activeBreaches
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 7. Geofences CRUD
// GET all geofences
app.get("/api/admin/geofences", async (req, res) => {
  try {
    const geofences = await geofenceModel.find({}).sort({ createdAt: 1 });
    res.status(200).json(geofences);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// POST create a new geofence
app.post("/api/admin/geofences", async (req, res) => {
  try {
    const { name, lat, lng, radius, color, description } = req.body;
    if (!name || !lat || !lng || !radius) {
      return res.status(400).json({ message: "name, lat, lng, radius are required" });
    }
    const gf = await geofenceModel.create({ name, lat, lng, radius, color: color || "#3b82f6", description: description || "" });
    res.status(201).json(gf);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// PUT update a geofence
app.put("/api/admin/geofences/:id", async (req, res) => {
  try {
    const { name, lat, lng, radius, color, description, active } = req.body;
    const gf = await geofenceModel.findByIdAndUpdate(
      req.params.id,
      { name, lat, lng, radius, color, description, active },
      { new: true, runValidators: true }
    );
    if (!gf) return res.status(404).json({ message: "Geofence not found" });
    res.status(200).json(gf);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// DELETE a geofence
app.delete("/api/admin/geofences/:id", async (req, res) => {
  try {
    const gf = await geofenceModel.findByIdAndDelete(req.params.id);
    if (!gf) return res.status(404).json({ message: "Geofence not found" });
    res.status(200).json({ message: "Geofence deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ─── Admin-only: Employee delete ─────────────────────────────────────────────
app.delete("/api/employees/:id", authMiddleware, async (req, res) => {
  try {
    const emp = await allEmployeeModel.findByIdAndDelete(req.params.id);
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    // Clean up location logs
    await locationLogModel.deleteMany({ userEmail: emp.email });
    res.status(200).json({ message: "Employee deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ─── PROFILE UPDATE REQUEST ENDPOINTS ────────────────────────────────────────

// Employee submits an update request
app.post("/api/update-request", async (req, res) => {
  try {
    const { email, name, employeeId, role, password } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const employee = await allEmployeeModel.findOne({ email });
    if (!employee) return res.status(404).json({ message: "User not found" });

    // Check if there's already a pending request from this user
    const existing = await updateRequestModel.findOne({ userId: employee._id, status: "Pending" });
    if (existing) {
      return res.status(409).json({ message: "You already have a pending update request. Please wait for admin approval." });
    }

    const newReq = await updateRequestModel.create({
      userId: employee._id,
      userName: employee.name,
      userEmail: email,
      requestedData: { name, email, employeeId, role, password }
    });

    res.status(201).json({ message: "Update request submitted. Awaiting admin approval.", requestId: newReq._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Admin fetches all PENDING update requests
app.get("/api/admin/update-requests", async (req, res) => {
  try {
    const requests = await updateRequestModel.find({ status: "Pending" }).sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Admin approves a request → apply changes to employee
app.put("/api/admin/update-requests/:id/approve", async (req, res) => {
  try {
    const request = await updateRequestModel.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "Pending") return res.status(400).json({ message: "Request already processed" });

    const employee = await allEmployeeModel.findById(request.userId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const { name, email, employeeId, role, password } = request.requestedData;

    // Apply non-sensitive fields
    if (name)       employee.name = name;
    if (email)      employee.email = email;
    if (employeeId) employee.EmployeeId = employeeId;
    if (role)       employee.role = role;

    // Hash and apply password only on admin approval
    if (password && password.trim() !== "") {
      const saltRounds = 6; // Fast hashing for free tier
      const hashed = await bcrypt.hash(password, saltRounds);
      employee.password = hashed;
    }

    await employee.save();

    request.status = "Approved";
    request.adminNote = req.body?.note || "Approved by admin";
    await request.save();

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Admin rejects a request
app.put("/api/admin/update-requests/:id/reject", async (req, res) => {
  try {
    const request = await updateRequestModel.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "Pending") return res.status(400).json({ message: "Request already processed" });

    request.status = "Rejected";
    request.adminNote = req.body?.note || "Rejected by admin";
    await request.save();

    res.status(200).json({ message: "Request rejected" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ─── LEAVE REQUEST ENDPOINTS ────────────────────────────────────────

// 1. Employee submits a leave request
app.post("/api/leave-request", async (req, res) => {
  try {
    const { email, requestType, startDate, endDate, reason } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const employee = await allEmployeeModel.findOne({ email });
    if (!employee) return res.status(404).json({ message: "User not found" });

    // Remove previous leave requests for this specific employee
    await leaveRequestModel.deleteMany({ userId: employee._id });

    const newReq = await leaveRequestModel.create({
      userId: employee._id,
      userName: employee.name,
      userEmail: email,
      requestType,
      startDate,
      endDate,
      reason
    });

    res.status(201).json({ message: "Leave request submitted.", requestId: newReq._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 2. Fetch leave requests for a single employee
app.get("/api/employee/leave-requests/:email", async (req, res) => {
  try {
    const requests = await leaveRequestModel.find({ userEmail: req.params.email }).sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 3. Admin fetches all leave requests
app.get("/api/admin/leave-requests", async (req, res) => {
  try {
    const requests = await leaveRequestModel.find({}).sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 4. Admin approves a leave request
app.put("/api/admin/leave-requests/:id/approve", async (req, res) => {
  try {
    const request = await leaveRequestModel.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = "Approved";
    request.adminNote = req.body?.note || "Approved by Admin";
    await request.save();

    // Notify employee via email
    sendLeaveStatusEmail(request.userEmail, request.userName, "Approved", request.adminNote).catch(console.error);

    res.status(200).json({ message: "Request approved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 5. Admin rejects a leave request
app.put("/api/admin/leave-requests/:id/reject", async (req, res) => {
  try {
    const request = await leaveRequestModel.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = "Rejected";
    request.adminNote = req.body?.note || "Rejected by Admin";
    await request.save();

    // Notify employee via email
    sendLeaveStatusEmail(request.userEmail, request.userName, "Rejected", request.adminNote).catch(console.error);

    res.status(200).json({ message: "Request rejected" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 9. Attendance Report Aggregation
app.get("/api/admin/attendance-report", async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth(); // 0-indexed
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const employees = await allEmployeeModel.find({});
    
    // Get all days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const workingDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays.push(d);
      }
    }

    // Fetch logs and leaves for the month
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month, daysInMonth, 23, 59, 59);

    const logs = await locationLogModel.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const leaves = await leaveRequestModel.find({
      status: "Approved",
      $or: [
        { startDate: { $lte: endOfMonth.toISOString() }, endDate: { $gte: startOfMonth.toISOString() } }
      ]
    });

    const report = employees.map(emp => {
      const empLogs = logs.filter(l => l.userEmail === emp.email);
      const empLeaves = leaves.filter(l => l.userEmail === emp.email);

      const presentDates = [];
      const leaveDates = [];
      const absentDates = [];

      workingDays.forEach(day => {
        const currentDate = new Date(year, month, day);
        const dateStr = currentDate.toISOString().split('T')[0];

        // 1. Check for Approved Leave (Highest Priority)
        const isOnLeave = empLeaves.some(l => {
          const start = new Date(l.startDate).toISOString().split('T')[0];
          const end = new Date(l.endDate).toISOString().split('T')[0];
          return dateStr >= start && dateStr <= end;
        });

        if (isOnLeave) {
          leaveDates.push(day);
          return;
        }

        // 2. Check for Presence vs Breach (Only if no leave)
        const dayLogs = empLogs.filter(l => {
          const logDate = new Date(l.createdAt).toISOString().split('T')[0];
          return logDate === dateStr;
        });

        const hasBreach = dayLogs.some(l => l.status === "Outside");
        const isPresent = dayLogs.length > 0 && !hasBreach;

        if (isPresent) {
          presentDates.push(day);
        } else {
          absentDates.push(day);
        }
      });

      return {
        id: emp._id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        stats: {
          present: presentDates.length,
          absent: absentDates.length,
          leave: leaveDates.length,
          totalWorking: workingDays.length
        },
        history: workingDays.map(day => ({
          day,
          status: presentDates.includes(day) ? "present" : leaveDates.includes(day) ? "leave" : "absent"
        })),
        absentDetails: absentDates
      };
    });

    res.status(200).json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown and errors
process.on("unhandledRejection", (err) => {
  console.error("CRITICAL: Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("CRITICAL: Uncaught Exception:", err);
});
