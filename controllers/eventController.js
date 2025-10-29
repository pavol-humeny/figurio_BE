const db = require('../services/db');

exports.getAllEvents = async (req, res) => {
  const { eventType, userId, dateFrom, dateTo } = req.query;
  let query = 'SELECT eventId, userId, eventType, data, timestamp FROM events WHERE 1=1';
  const params = [];

  if (eventType) {
    query += ' AND eventType = ?';
    params.push(eventType);
  }
  if (userId) {
    query += ' AND userId = ?';
    params.push(userId);
  }
  if (dateFrom) {
    query += ' AND timestamp >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    query += ' AND timestamp <= ?';
    params.push(dateTo);
  }

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};
