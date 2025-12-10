const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendContactEmail = async ({ name, email, subject, message }) => {
  // Send via Resend HTTP API
  const { data, error } = await resend.emails.send({
    from: `"${name}" <${process.env.MAIL_FROM}>`, // musí byť overená adresa
    to: process.env.MAIL_TO,
    reply_to: email,
    subject,
    html: `
      <h2>New contact form message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p>${message}</p>
    `,
  });

  if (error) throw error;
  return data;
};
