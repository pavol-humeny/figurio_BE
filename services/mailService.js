const axios = require("axios");

exports.sendContactEmail = async ({ name, email, subject, message }) => {
  // Build the HTML body
  const htmlBody = `
    <h2>New contact form message</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Message:</strong><br>${message}</p>
  `;

  // Send email using Resend API
  const response = await axios.post(
    "https://api.resend.com/emails",
    {
      from: "Figurio", // or your domain if verified
      to: process.env.MAIL_TO,
      subject: subject,
      html: htmlBody,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};
