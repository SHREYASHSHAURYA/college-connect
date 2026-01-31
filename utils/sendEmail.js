require("dotenv").config();

async function sendEmail({ to, subject, text, html }) {
  

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: {
          name: "College Connect",
          email: process.env.EMAIL_FROM
        },
        to: [{ email: to }],
        subject: subject,
        textContent: text,
        htmlContent: html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ BREVO API ERROR:", data);
      throw new Error("Brevo email failed");
    }

    
  } catch (err) {
    console.error("❌ EMAIL FAILED:", err);
    throw err;
  }
}

module.exports = sendEmail;