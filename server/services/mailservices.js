const axios = require("axios");

const sendMailServices = async (to, subject, empname) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.APP_EMAIL;

  if (!apiKey) {
    console.error("❌ BREVO_API_KEY is missing!");
    return { success: false, error: "API Key missing" };
  }

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "HR Attendance System", email: senderEmail },
        to: [{ email: to.trim() }],
        subject: subject,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4f46e5;">Welcome to the Team, ${empname}!</h2>
            <p>Your employee account has been successfully created.</p>
            <p>You can now access the system at the link below:</p>
            <div style="margin: 20px 0;">
              <a href="https://attendance-tawny-eight.vercel.app/login" 
                 style="background: #4f46e5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Login to Dashboard
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">If you have any issues logging in, please contact your administrator.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">Regards,<br>HR Department</p>
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

    console.log("✅ Brevo Registration mail sent successfully. Id:", response.data.messageId);
    return { success: true, data: response.data };
  } catch (err) {
    console.error("❌ Brevo API Error (Mail):", err.response ? err.response.data : err.message);
    return { success: false, error: err.message };
  }
};

const sendLeaveStatusEmail = async (to, empname, status, note) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.APP_EMAIL;

  if (!apiKey) return { success: false, error: "API Key missing" };

  const isApproved = status === "Approved";
  const color = isApproved ? "#059669" : "#dc2626";
  const emoji = isApproved ? "✅" : "❌";

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "HR Attendance System", email: senderEmail },
        to: [{ email: to.trim() }],
        subject: `Leave Request Status: ${status}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 25px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-size: 40px;">${emoji}</span>
              <h2 style="color: ${color}; margin-top: 10px;">Leave Request ${status}</h2>
            </div>
            
            <p>Dear <strong>${empname}</strong>,</p>
            <p>Your leave request has been reviewed by the administration.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${color};">
              <p style="margin: 0; font-weight: bold; font-size: 14px; text-transform: uppercase; color: #64748b;">Administrator's Note:</p>
              <p style="margin: 10px 0 0 0; color: #1e293b; line-height: 1.6;">"${note || "No specific note provided."}"</p>
            </div>

            <p style="color: #666; font-size: 14px;">Please check your dashboard for further details and to plan your schedule accordingly.</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="https://attendance-tawny-eight.vercel.app/login" 
                 style="background: ${color}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                View Dashboard
              </a>
            </div>

            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
              This is an automated security notification from HR SecureTrack.
            </p>
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

    console.log(`✅ Leave Status (${status}) mail sent to ${to}`);
    return { success: true, data: response.data };
  } catch (err) {
    console.error("❌ Brevo API Error (Leave Status):", err.response ? err.response.data : err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendMailServices, sendLeaveStatusEmail };