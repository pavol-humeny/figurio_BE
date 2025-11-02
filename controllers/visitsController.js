const db = require("../services/db");

// Get all visits by day
// [{date (YYYY-MM-DD), allVisits, uniqueVisits}, ...]
exports.getVisitsByDay = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        DATE(timestamp) AS date,  -- rename column to match desired output
        COUNT(*) AS allVisits,
        COUNT(DISTINCT userId) AS uniqueVisits
      FROM visits
      GROUP BY date
      ORDER BY date DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// Get total visits count
// { totalVisits }
exports.getAllVisitsCount = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT COUNT(*) AS totalVisits
      FROM visits
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// Get unique visits count
// { uniqueVisitors }
exports.getUniqueVisitsCount = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT COUNT(DISTINCT userId) AS uniqueVisitors
      FROM visits
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// Get visits for the last seven days
// [{date (YYYY-MM-DD), allVisits, newUsers}, ...]
exports.getLastSevenDaysVisits = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        DATE(v.timestamp) AS date,
        COUNT(*) AS allVisits,
        SUM(CASE 
              WHEN v.timestamp = u.first_visit THEN 1 
              ELSE 0 
            END) AS newUsers
      FROM visits v
      JOIN (
        SELECT userId, MIN(timestamp) AS first_visit
        FROM visits
        GROUP BY userId
      ) u ON u.userId = v.userId
      WHERE v.timestamp >= CURDATE() - INTERVAL 7 DAY
      GROUP BY date
      ORDER BY date DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// Get visits grouped by country
// [{country, visitCount}, ...]
exports.getVisitsByCountry = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        country,
        COUNT(*) AS visitCount
      FROM visits
      GROUP BY country
      ORDER BY visitCount DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// Get all visits by day
// [{date, allVisits, newUsers}, ...]
exports.getVisitsByDay = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        DATE(v.timestamp) AS date,
        COUNT(*) AS allVisits,
        SUM(CASE 
              WHEN v.timestamp = u.first_visit THEN 1 
              ELSE 0 
            END) AS newUsers
      FROM visits v
      JOIN (
        SELECT userId, MIN(timestamp) AS first_visit
        FROM visits
        GROUP BY userId
      ) u ON u.userId = v.userId
      GROUP BY date
      ORDER BY date DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
