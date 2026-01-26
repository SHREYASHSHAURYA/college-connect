require("dotenv").config();
const SibApiV3Sdk = require("@getbrevo/brevo");

const client = SibApiV3Sdk.ApiClient.instance;

// Authenticate with API key
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendEmail({ to, subject, text, html }) {
  console.log("📧 sendEmail CALLED for:", to);

  try {
    const response = await apiInstance.sendTransacEmail({
      sender: {
        email: process.env.EMAIL_FROM,
        name: "College Connect"
      },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html
    });

    console.log("✅ EMAIL SENT VIA BREVO API:", response.messageId);
  } catch (err) {
    console.error("❌ BREVO API EMAIL FAILED:", err.response?.body || err);
    throw err;
  }
}

module.exports = sendEmail;