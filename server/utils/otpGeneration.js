const { randomInt } = require("crypto");

// Use cryptographically secure random integer (Node.js built-in)
const otpService = () => {
  return randomInt(1000, 10000); // 4-digit OTP: 1000–9999
};

module.exports = otpService;