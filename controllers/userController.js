const db = require('../services/db');

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
    res.status(500).send('Server error');
  }
};

exports.getUserVisits = async (req, res) => {
  const userId = req.params.userId;
  try {
    const [rows] = await db.query(
      'SELECT visitId, timestamp FROM visits WHERE userId = ?',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.addUserVisit = async (req, res) => {
  const userId = req.params.userId;
  try {
    await db.query('INSERT INTO visits (userId) VALUES (?)', [userId]);
    res.status(201).send('Visit saved');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.getUserEvents = async (req, res) => {
  const userId = req.params.userId;
  try {
    const [rows] = await db.query(
      'SELECT eventId, eventType, data, timestamp FROM events WHERE userId = ?',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.addUserEvent = async (req, res) => {
  const userId = req.params.userId;
  const { eventType, data } = req.body;
  try {
    await db.query(
      'INSERT INTO events (userId, eventType, data) VALUES (?, ?, ?)',
      [userId, eventType, JSON.stringify(data)]
    );
    res.status(201).send('Event saved');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};
