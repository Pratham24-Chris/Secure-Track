const mongoose = require("mongoose");

const updateRequestSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
    userName:  { type: String, required: true },
    userEmail: { type: String, required: true },
    requestedData: {
      name:       { type: String },
      email:      { type: String },
      employeeId: { type: String },
      role:       { type: String },
      password:   { type: String } // raw (will be hashed on approve)
    },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    adminNote: { type: String, default: "" }
  },
  { timestamps: true }
);

const updateRequestModel = mongoose.model("UpdateRequest", updateRequestSchema);
module.exports = updateRequestModel;
