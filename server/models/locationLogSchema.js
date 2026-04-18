const mongoose = require("mongoose");

const locationLogSchema = new mongoose.Schema(
  {
    userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
    userEmail:        { type: String, required: true },
    userName:         { type: String, required: true },
    userRole:         { type: String },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    status: { type: String, enum: ["Inside", "Outside", "On Leave", "WFH"], required: true },
    punchInTime: { type: String }, 
    punchInLocation: { type: String }
  },
  { timestamps: true }
);

const locationLogModel = mongoose.model("LocationLog", locationLogSchema);
module.exports = locationLogModel;
