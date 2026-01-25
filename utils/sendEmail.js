const SibApiV3Sdk = require("sib-api-v3-sdk");

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendEmail({ to, subject, text, html }) {
  await apiInstance.sendTransacEmail({
    sender: {
      email: process.env.EMAIL_FROM,
      name: "College Connect"
    },
    to: [{ email: to }],
    subject,
    textContent: text,
    htmlContent: html
  });
}

module.exports = sendEmail;