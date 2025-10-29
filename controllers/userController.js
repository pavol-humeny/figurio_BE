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
      [userId]
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

  try {
    // Get IP and User-Agent
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"] || "unknown";

    // GeoIP lookup
    const geo = geoip.lookup(ip) || {};
    const country = geo.country || null;
    const city = geo.city || null;

    // Check if user exists
    const [userRows] = await db.query(
      "SELECT userId FROM users WHERE userId = ?",
      [userId]
    );

    if (userRows.length === 0) {
      await db.query("INSERT INTO users (userId) VALUES (?)", [userId]);
      console.log(`Created new user with userId: ${userId}`);
    }

    // Add visit with IP, User-Agent, and geolocation
    await db.query(
      "INSERT INTO visits (userId, ip, userAgent, country, city) VALUES (?, ?, ?, ?, ?)",
      [userId, ip, userAgent, country, city]
    );

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
      [userId]
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
      [userId, eventType, JSON.stringify(data)]
    );
    res.status(201).send("Event saved");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
