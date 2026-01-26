require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY
  }
});

async function sendEmail({ to, subject, text, html }) {
  console.log("📧 sendEmail CALLED for:", to);

  await transporter.sendMail({
    from: `"College Connect" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    text,
    html
  });

  console.log("✅ sendMail FINISHED");
}

module.exports = sendEmail;