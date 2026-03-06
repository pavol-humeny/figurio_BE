const db = require("../services/db");
const geoip = require("geoip-lite");

exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.userId, COUNT(v.visitId) AS visitCount
      FROM users u
      LEFT JOIN visits v ON u.userId = v.userId
      GROUP BY u.userId
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
exports.getUserVisits = async (req, res) => {
  const userId = req.params.userId;
  try {
    const [rows] = await db.query(
      `SELECT visitId, timestamp, ip, userAgent, country, city
        FROM visits
        WHERE userId = ?`,
      [userId],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// Add user visit – create user automatically if not exists
exports.addUserVisit = async (req, res) => {
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

    // Check if user exists
    const [userRows] = await db.query(
      "SELECT userId FROM users WHERE userId = ?",
      [userId],
    );

    if (userRows.length === 0) {
      await db.query("INSERT INTO users (userId) VALUES (?)", [userId]);
      console.log(`[DEBUG] Created new user with userId: ${userId}`);
    }

    // Add visit
    await db.query(
      "INSERT INTO visits (userId, ip, userAgent, country, city) VALUES (?, ?, ?, ?, ?)",
      [userId, ip, userAgent, country, city],
    );

    console.log(`[DEBUG] Visit saved for user ${userId}`);
    res.status(201).send("Visit saved");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.getUserEvents = async (req, res) => {
  const userId = req.params.userId;
  try {
    const [rows] = await db.query(
      "SELECT eventId, eventType, data, timestamp FROM events WHERE userId = ?",
      [userId],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.addUserEvent = async (req, res) => {
  const userId = req.params.userId;
  const { eventType, data } = req.body;
  try {
    await db.query(
      "INSERT INTO events (userId, eventType, data) VALUES (?, ?, ?)",
      [userId, eventType, JSON.stringify(data)],
    );
    res.status(201).send("Event saved");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// Add user session
exports.addUserSession = async (req, res) => {
  const userId = req.params.userId;
  const { durationMs } = req.body;
  try {
    await db.query("INSERT INTO sessions (userId, durationMs) VALUES (?, ?)", [
      userId,
      durationMs,
    ]);

    console.log(
      `[DEBUG] Session saved for user ${userId} with duration ${durationMs}ms`,
    );
    res.status(201).send("Session saved");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// Get session statistics by day
// [{ date, allVisits, minSession, maxSession, avgSession }, ...]
exports.getUserSessions = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        DATE(v.timestamp) AS date,

        COUNT(DISTINCT v.visitId) AS allVisits,

        ROUND(MIN(s.durationMs) / 60000, 2) AS minSession,
        ROUND(MAX(s.durationMs) / 60000, 2) AS maxSession,
        ROUND(AVG(s.durationMs) / 60000, 2) AS avgSession

      FROM visits v
      LEFT JOIN sessions s
        ON s.userId = v.userId
        AND DATE(s.timestamp) = DATE(v.timestamp)

      GROUP BY date
      ORDER BY date DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
