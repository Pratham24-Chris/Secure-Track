const axios = require("axios");

const sendBreachAlertEmail = async (to, empName, otp, lat, lng) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.APP_EMAIL;

  if (!apiKey) {
    console.error("❌ BREVO_API_KEY is missing!");
    return { success: false, error: "API Key missing" };
  }

  const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
  const timestamp = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "medium",
  });

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "System Security Alert", email: senderEmail },
        to: [{ email: to.trim() }],
        subject: `🚨 URGENT: Geofence Breach Alert for ${empName}`,
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 2px solid #dc2626; border-radius: 10px; overflow: hidden;">
            <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">SECURITY ALERT</h1>
            </div>
            <div style="padding: 20px;">
              <p>Hello <strong>${empName}</strong>,</p>
              <p style="color: #666;">A geofence boundary violation was detected at <strong>${timestamp}</strong>.</p>
              
              <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Latitude:</strong> ${lat}</p>
                <p style="margin: 5px 0;"><strong>Longitude:</strong> ${lng}</p>
                <p style="margin: 5px 0;"><a href="${mapLink}" style="color: #2563eb;">View on Google Maps</a></p>
              </div>

              <p>Please enter the following OTP to verify your identity and confirm your location status:</p>
              <div style="text-align: center; font-size: 36px; font-weight: bold; background: #111827; color: white; padding: 15px; border-radius: 5px; letter-spacing: 10px;">
                ${otp}
              </div>
              <p style="font-size: 12px; color: #999; margin-top: 20px;">If this wasn't you, please contact security immediately.</p>
            </div>
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

    console.log("✅ Brevo Breach alert sent successfully. Id:", response.data.messageId);
    return { success: true, data: response.data };
  } catch (err) {
    console.error("❌ Brevo API Error (Breach):", err.response ? err.response.data : err.message);
    return { success: false, error: err.message };
  }
};

module.exports = sendBreachAlertEmail;
