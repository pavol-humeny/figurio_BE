const mailService = require("../services/mailService");
const geoip = require("geoip-lite");

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

exports.visitDuringMaintenance = async (req, res) => {
  const userId = req.params.userId;
  const ipFromClient = req.body.ip; // FE send IP

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

    console.log(
      `[DEBUG] UserID: ${userId}, IP: ${ip}, Country: ${country}, City: ${city}, UA: ${userAgent}`,
    );

    // Send email notification
    await mailService.sendVisitDuringMaintenanceEmail({
      userId,
      ip,
      country,
      city,
      userAgent,
      time: new Date().toISOString(),
    });

    res.status(200).send("Maintenance visit email sent successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
