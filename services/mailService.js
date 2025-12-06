const nodemailer = require("nodemailer");

// Configure the transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST, // e.g. smtp.gmail.com
  port: process.env.MAIL_PORT, // usually 465 or 587
  secure: process.env.MAIL_SECURE === "true",
  auth: {
    user: process.env.MAIL_USER, // login
    pass: process.env.MAIL_PASS, // password / app password
  },
});

exports.sendContactEmail = async ({ name, email, subject, message }) => {
  // Construct the email
  const mailOptions = {
    from: `"${name}" <${email}>`,
    to: process.env.MAIL_TO, // where the email should be delivered
    subject: subject,
    text: message,
    html: `
      <h2>New contact form message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong><br>${message}</p>
    `,
  };

  // Send the message
  return transporter.sendMail(mailOptions);
};
