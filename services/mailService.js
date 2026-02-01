const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendContactEmail = async ({ name, email, subject, message }) => {
  const message = `
    <h2>New contact form message</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p>${message}</p>
  `;

  // Send via Resend HTTP API
  const { data, error } = await resend.emails.send({
    from: `"${name}" <${process.env.MAIL_FROM}>`, 
    to: process.env.MAIL_TO,
    reply_to: email,
    subject,
    html: message,
  });

  if (error) throw error;
  return data;
};

exports.sendVisitDuringMaintenanceEmail = async ({
  userId,
  ip,
  country,
  city,
  userAgent,
  time,
}) => {
  const subject = `Maintenance Visit from User ${userId}`;
  const message = `
    <h2>User Visit During Maintenance</h2>
    <p><strong>User ID:</strong> ${userId}</p>
    <p><strong>IP Address:</strong> ${ip}</p>
    <p><strong>Country:</strong> ${country || "Unknown"}</p>
    <p><strong>City:</strong> ${city || "Unknown"}</p>
    <p><strong>User Agent:</strong> ${userAgent}</p>
    <p><strong>Time:</strong> ${time}</p>
  `;

  // Send via Resend HTTP API
  const { data, error } = await resend.emails.send({
    from: `"Maintenance Bot" <${process.env.MAIL_FROM}>`,
    to: process.env.MAIL_TO,
    subject,
    html: message,
  });

  if (error) throw error;
  return data;
};
