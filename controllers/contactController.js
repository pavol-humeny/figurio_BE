const mailService = require("../services/mailService");

exports.sendContactForm = async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Basic validation
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
