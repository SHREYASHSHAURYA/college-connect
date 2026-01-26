require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("ENV CHECK → BREVO_SMTP_USER:", process.env.BREVO_SMTP_USER ? "FOUND" : "MISSING");
console.log("ENV CHECK → BREVO_SMTP_KEY:", process.env.BREVO_SMTP_KEY ? "FOUND" : "MISSING");
console.log("ENV CHECK → EMAIL_FROM:", process.env.EMAIL_FROM ? "FOUND" : "MISSING");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY
  }
});
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP VERIFY FAILED:", error);
  } else {
    console.log("✅ SMTP SERVER READY");
  }
});
async function sendEmail({ to, subject, text, html }) {
  console.log("📧 sendEmail CALLED for:", to);

  try {
    const info = await transporter.sendMail({
      from: `"College Connect" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      text,
      html
    });

    console.log("✅ EMAIL SENT. Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ EMAIL FAILED:", err);
  }
}

module.exports = sendEmail;