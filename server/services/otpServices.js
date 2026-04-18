const axios = require("axios");

const sendOTPServices = async (to, subject, otp) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.APP_EMAIL; // Use the email verified in Brevo

  if (!apiKey) {
    console.error("❌ BREVO_API_KEY is missing!");
    return { success: false, error: "API Key missing" };
  }

  console.log(`📧 Attempting to send OTP to: ${to} using Brevo...`);

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "SecureTrack Attendance", email: senderEmail },
        to: [{ email: to.trim() }],
        subject: subject,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #4f46e5;">Verification OTP</h2>
            <p>Hello,</p>
            <p>Your One-Time Password (OTP) for login is:</p>
            <div style="font-size: 32px; font-weight: bold; background: #f3f4f6; padding: 15px; display: inline-block; border-radius: 5px; color: #111827; letter-spacing: 5px;">
              ${otp}
            </div>
            <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">This OTP is valid for 5 minutes. Do not share it with anyone.</p>
          </div>
        `,
      },
      {
        headers: {
          "api-key": apiKey.trim(),
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Brevo OTP email sent successfully. MessageId:", response.data.messageId);
    return { success: true, data: response.data };
  } catch (err) {
    console.error("❌ Brevo API Error:", err.response ? err.response.data : err.message);
    return { success: false, error: err.message };
  }
};

module.exports = sendOTPServices;