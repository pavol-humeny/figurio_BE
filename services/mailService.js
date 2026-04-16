/**
 * @file: mailService.js
 * @author: Pavol Humeny
 * @date: 15.5.2026
 * @description: Service for sending emails using the Resend API. Handles contact form submissions, notifications for visits during maintenance, and user ratings.
 */

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email when a user submits the contact form.
 * @param {Object} param0 - The contact form data.
 * @param {string} param0.name - The name of the user.
 * @param {string} param0.email - The email address of the user.
 * @param {string} param0.subject - The subject of the message.
 * @param {string} param0.message - The message content.
 * @returns {Promise<Object>} - The response from the Resend API.
 * @throws Will throw an error if the email fails to send.
 */
exports.sendContactEmail = async ({ name, email, subject, message }) => {
  const messageBody = `
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
    html: messageBody,
  });

  if (error) throw error;
  return data;
};

/**
 * Send an email notification when a user visits the site during maintenance.
 * @param {Object} param0 - The visit data.
 * @param {string} param0.userId - The ID of the user.
 * @param {string} param0.ip - The IP address of the user.
 * @param {string} param0.country - The country of the user (if available).
 * @param {string} param0.city - The city of the user (if available).
 * @param {string} param0.userAgent - The user agent string of the user's browser.
 * @param {string} param0.time - The time of the visit.
 * @returns {Promise<Object>} - The response from the Resend API.
 * @throws Will throw an error if the email fails to send.
 */
exports.sendVisitDuringMaintenanceEmail = async ({
  userId,
  ip,
  country,
  city,
  userAgent,
  time,
}) => {
  const subject = `Maintenance Visit from User ${userId}`;
  const messageBody = `
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
    html: messageBody,
  });

  if (error) throw error;
  return data;
};

/**
 * Send an email notification when a user submits a rating.
 * @param {Object} param0 - The rating data.
 * @param {string} param0.userId - The ID of the user.
 * @param {number} param0.rating - The rating value (e.g., 1-5).
 * @param {string} [param0.comment] - An optional comment from the user.
 * @returns {Promise<Object>} - The response from the Resend API.
 * @throws Will throw an error if the email fails to send.
 */
exports.sendRatingEmail = async ({ userId, rating, comment }) => {
  const subject = `New Rating from User ${userId}`;
  const messageBody = `
    <h2>New User Rating</h2>
    <p><strong>User ID:</strong> ${userId}</p>
    <p><strong>Rating:</strong> ${rating} / 5</p>
    <p><strong>Comment:</strong> ${comment || "No comment provided"}</p>
  `;

  // Send via Resend HTTP API
  const { data, error } = await resend.emails.send({
    from: `"Rating Bot" <${process.env.MAIL_FROM}>`,
    to: process.env.MAIL_TO,
    subject,
    html: messageBody,
  });

  if (error) throw error;
  return data;
};
