const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    requestType: { type: String, enum: ["Full Day Leave", "Half Day Leave", "Work from Home", "Other"], required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    adminNote: { type: String, default: "" }
  },
  { timestamps: true }
);

const leaveRequestModel = mongoose.model("LeaveRequest", leaveRequestSchema);
module.exports = leaveRequestModel;
