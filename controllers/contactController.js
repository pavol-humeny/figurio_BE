/**
 * @file: contactController.js
 * @author: Pavol Humeny
 * @date: 15.5.2026
 * @description: Controller for handling contact-related API endpoints, including contact form submissions, notifications for visits during maintenance, and user ratings for the Figurio application.
 */

const mailService = require("../services/mailService");
const geoip = require("geoip-lite");
const db = require("../services/db");

/**
 * Handle contact form submission by sending an email with the provided details. Validates the input and responds with appropriate status codes based on success or failure of the email sending process.
 * @param {Object} req - The Express request object containing the contact form data in the body.
 * @param {Object} res - The Express response object used to send back the appropriate response.
 * @returns {Promise<void>} - A promise that resolves when the email is sent or an error occurs.
 * @throws Will send a 400 status code if required fields are missing, and a 500 status code if there is an error sending the email.
 */
exports.sendContactForm = async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validation
  if (!name || !email || !subject || !message) {
    return res.status(400).send("Missing required fields.");
  }

  try {
    // Send email using the service
    await mailService.sendContactEmail({ name, email, subject, message });

    res.status(200).send("Email sent successfully.");
  } catch (err) {
    console.error("Failed to send email:", err);
    res.status(500).send("Failed to send email.");
  }
};

/**
 * Handle a visit during maintenance by sending an email notification with the visit details, including user ID, IP address, geolocation, user agent, and time of the visit. The IP address is determined from the request headers or body, and geolocation is performed using the geoip-lite library.
 * @param {Object} req - The Express request object containing the user ID in the parameters and IP address in the body.
 * @param {Object} res - The Express response object used to send back the appropriate response.
 * @returns {Promise<void>} - A promise that resolves when the email is sent or an error occurs.
 * @throws Will send a 500 status code if there is an error sending the email.
 */
exports.visitDuringMaintenance = async (req, res) => {
  const userId = req.params.userId;
  const ipFromClient = req.body.ip; 

  try {
    // Get IP from client or fallback to headers
    let ip =
      ipFromClient ||
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.ip ||
      req.connection.remoteAddress;
    if (ip.startsWith("::ffff:")) ip = ip.split("::ffff:")[1];

    const userAgent = req.headers["user-agent"] || "unknown";

    // Determine if localhost
    const isLocalhost = ip === "127.0.0.1" || ip === "::1";

    // GeoIP lookup
    const geo = !isLocalhost ? geoip.lookup(ip) || {} : {};
    const country = geo.country || (isLocalhost ? "DEV" : null);
    const city = geo.city || (isLocalhost ? "DEV" : null);

    // Set formatted time
    const now = new Date();

    const time = now.toLocaleString("sk-SK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Send email notification
    await mailService.sendVisitDuringMaintenanceEmail({
      userId,
      ip,
      country,
      city,
      userAgent,
      time,
    });

    res.status(200).send("Maintenance visit email sent successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Handle user rating submission by inserting the rating into the database and sending an email notification with the rating details. Validates the input and responds with appropriate status codes based on success or failure of the database insertion and email sending process.
 * @param {Object} req - The Express request object containing the user ID in the parameters and rating details in the body.
 * @param {Object} res - The Express response object used to send back the appropriate response.
 * @returns {Promise<void>} - A promise that resolves when the rating is submitted and email is sent or an error occurs.
 * @throws Will send a 500 status code if there is an error submitting the rating or sending the email.
 */
exports.submitRating = async (req, res) => {
  const userId = req.params.userId;
  const { rating, feedback, numberOfExports } = req.body;

  try {
    // Insert rating into the database
    await db.query(
      `
      INSERT INTO ratings (userId, rating, feedback, numberOfExports)
      VALUES (?, ?, ?, ?)
      `,
      [userId, rating, feedback || null, numberOfExports || 0],
    );

    // Send email notification
    await mailService.sendRatingEmail({ userId, rating, comment: feedback });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error submitting rating:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
