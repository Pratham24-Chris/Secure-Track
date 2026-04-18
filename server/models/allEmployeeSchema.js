const mongoose = require("mongoose")

const allEmployeeSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, index: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true },
    EmployeeId: { type: String, required: true, trim: true },
    role:       { type: String, required: true, lowercase: true, trim: true },
    contact:    { type: Number },
    theme:      { type: String, default: 'light' },
    // ── Account Lockout (Feature 4) ─────────────────────────────────────────
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil:           { type: Date, default: null }
  },
  { timestamps: true }
);

const allEmployeeModel = mongoose.model("employees", allEmployeeSchema)

module.exports = allEmployeeModel

// Name
// Email
// Password
// Employee ID
// Role