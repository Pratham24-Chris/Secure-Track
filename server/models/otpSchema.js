const mongoose = require("mongoose")

const otpSchema = mongoose.Schema({
  otp: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId
  },
  createdAt: {
    type: Date,
    default: Date.now, // ✅ function reference — called on each doc create, NOT once at schema load
    expires: 300       // 5-minute TTL
  }
})

const otpModel = mongoose.model("otp_store", 
  otpSchema)

  module.exports = otpModel