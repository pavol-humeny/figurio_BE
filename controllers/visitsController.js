/**
 * @file visitsController.js
 * @author Pavol Humeny
 * @date 15.5.2026
 * @description Controller for handling visit-related API endpoints, including fetching visits by day, unique visits, visits by country, and other visit statistics for the Figurio application.
 */

const db = require("../services/db");

/**
 * Get visits grouped by day, including total visits and new users for each day. Executes a SQL query that aggregates visit data by date, counts total visits and identifies new users based on their first visit timestamp, and returns the results in the response.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the visits by day data or an error message.
 * @returns {Promise<void>} - A promise that resolves when the visits by day data is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the visits by day data from the database.
 *
 * [{date (YYYY-MM-DD), allVisits, newUsers}, ...]
 */
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

/**
 * Get total visits count. Executes a SQL query that counts the total number of visits in the database and returns the result in the response.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the total visits count or an error message.
 * @returns {Promise<void>} - A promise that resolves when the total visits count is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the total visits count from the database.
 *
 * {totalVisits: number}
 */
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

/**
 * Get unique visits count. Executes a SQL query that counts the number of distinct user IDs in the visits table to determine the total number of unique visitors and returns the result in the response.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the unique visits count or an error message.
 * @returns {Promise<void>} - A promise that resolves when the unique visits count is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the unique visits count from the database.
 *
 * {uniqueVisitors: number}
 */
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

/**
 * Get visits for the last days. Executes a SQL query that fetches visit data for the specified number of days and returns the results in the response.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the last days visits data or an error message.
 * @returns {Promise<void>} - A promise that resolves when the last days visits data is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the last days visits data from the database.
 *
 * [{date (YYYY-MM-DD), allVisits, newUsers}, ...]
 */
exports.getLastDaysVisits = async (req, res) => {
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

/**
 * Get average number of specific events per visit grouped by day. Executes a SQL query that calculates the average number of uploadImage, exportImage, and applyOperation events per visit for each day, and returns the results in the response.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the average events per visit by day data or an error message.
 * @returns {Promise<void>} - A promise that resolves when the average events per visit by day data is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the average events per visit by day data from the database.
 *
 * [{date (YYYY-MM-DD), allVisits, avgUploadImage, avgExportImage, avgApplyOperation}, ...]
 */
exports.getAvgEventsPerVisitByDay = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        DATE(v.timestamp) AS date,
        COUNT(DISTINCT v.visitId) AS allVisits,

        ROUND(
          SUM(CASE WHEN e.eventType = 'uploadImage' THEN 1 ELSE 0 END)
          / NULLIF(COUNT(DISTINCT v.visitId), 0),
          2
        ) AS avgUploadImage,

        ROUND(
          SUM(CASE WHEN e.eventType = 'exportImage' THEN 1 ELSE 0 END)
          / NULLIF(COUNT(DISTINCT v.visitId), 0),
          2
        ) AS avgExportImage,

        ROUND(
          SUM(CASE WHEN e.eventType = 'applyOperation' THEN 1 ELSE 0 END)
          / NULLIF(COUNT(DISTINCT v.visitId), 0),
          2
        ) AS avgApplyOperation

      FROM visits v
      LEFT JOIN events e
        ON e.userId = v.userId
        AND DATE(e.timestamp) = DATE(v.timestamp)

      GROUP BY date
      ORDER BY date DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Get visits grouped by country. Executes a SQL query that counts the number of visits for each country and returns the results in the response.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the visits by country data or an error message.
 * @returns {Promise<void>} - A promise that resolves when the visits by country data is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the visits by country data from the database.
 *
 * [{country, visitCount}, ...]
 */
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

/**
 * Get all visits by day. Executes a SQL query that counts the number of visits for each day and returns the results in the response.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the visits by day data or an error message.
 * @returns {Promise<void>} - A promise that resolves when the visits by day data is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the visits by day data from the database.
 *
 * [{date, allVisits, newUsers}, ...]
 */
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

/**
 * Get visits grouped by day for the full date range. Executes a SQL query that generates a complete list of dates from the earliest visit to the current date, counts total visits and identifies new users for each date, and returns the results in the response.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the visits by day full range data or an error message.
 * @returns {Promise<void>} - A promise that resolves when the visits by day full range data is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the visits by day full range data from the database.
 *
 * [{date (YYYY-MM-DD), allVisits, newUsers}, ...]
 */
exports.getVisitsByDayFullRange = async (req, res) => {
  try {
    const [rows] = await db.query(`
      WITH RECURSIVE dates AS (
        SELECT DATE(MIN(timestamp)) AS date
        FROM visits

        UNION ALL

        SELECT DATE_ADD(date, INTERVAL 1 DAY)
        FROM dates
        WHERE date < CURDATE()
      ),
      first_visits AS (
        SELECT
          userId,
          MIN(timestamp) AS first_visit
        FROM visits
        GROUP BY userId
      )
      SELECT
        d.date AS date,
        COUNT(v.userId) AS allVisits,
        SUM(
          CASE
            WHEN v.timestamp = f.first_visit THEN 1
            ELSE 0
          END
        ) AS newUsers
      FROM dates d
      LEFT JOIN visits v
        ON DATE(v.timestamp) = d.date
      LEFT JOIN first_visits f
        ON f.userId = v.userId
      GROUP BY d.date
      ORDER BY d.date ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Get visits grouped by user. Executes a SQL query that counts the number of visits for each user and returns the results in the response.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the visits by user data or an error message.
 * @returns {Promise<void>} - A promise that resolves when the visits by user data is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the visits by user data from the database.
 *
 * [{userId, visitCount}, ...]
 */
exports.getVisitsByUser = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        userId,
        COUNT(*) AS visitCount
      FROM visits
      GROUP BY userId
      ORDER BY visitCount DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Get the number of PWA visits. Executes a SQL query that counts the number of visits where isPWA is true and returns the result in the response.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the number of PWA visits or an error message.
 * @returns {Promise<void>} - A promise that resolves when the number of PWA visits is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the number of PWA visits from the database.
 *
 * { pwaVisits }
 */
exports.getNumberOfPWAVisits = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT COUNT(*) AS pwaVisits
      FROM visits
      WHERE isPWA = TRUE
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
