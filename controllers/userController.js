const db = require("../services/db");

// Add a new user (based on OpenAPI spec)
exports.addUser = async (req, res) => {
  const { userId } = req.body; // Expecting only userId in request body
  if (!userId) {
    return res.status(400).json({ error: "Missing userId in request body" });
  }

  try {
    await db.query("INSERT INTO users (userId) VALUES (?)", [userId]);
    res.status(201).json({ message: "User created", userId });
  } catch (err) {
    console.error(err);
    // Handle duplicate key or constraint error nicely
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "User already exists" });
    }
    res.status(500).send("Server error");
  }
};

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
      "SELECT visitId, timestamp FROM visits WHERE userId = ?",
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.addUserVisit = async (req, res) => {
  const userId = req.params.userId;
  try {
    await db.query("INSERT INTO visits (userId) VALUES (?)", [userId]);
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
