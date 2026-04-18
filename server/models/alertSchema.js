const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
    userEmail: { type: String },
    userName: { type: String },
    eventType: { type: String, default: "Geofence Breach" },
    detail: { type: String, default: "OTP verification required." },
    status: { type: String, enum: ["Pending", "Alarm", "Resolved"], default: "Pending" },
    lat: { type: Number },
    lng: { type: Number },
    expiresAt: { type: Date } // 5 mins from creation
  },
  { timestamps: true }
);

const alertModel = mongoose.model("Alert", alertSchema);
module.exports = alertModel;
