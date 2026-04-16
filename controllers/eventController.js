/**
 * @file: eventController.js
 * @author: Pavol Humeny
 * @date: 15.5.2026
 * @description: Controller for handling event-related API endpoints, including fetching all events, event overviews, and specific event types for the Figurio application.
 */

const db = require("../services/db");

/**
 * Get all events with optional filtering by event type, user ID, and date range. Constructs a dynamic SQL query based on the provided query parameters and returns the matching events from the database.
 * @param {Object} req - The Express request object containing query parameters for filtering events.
 * @param {Object} res - The Express response object used to send back the matching events or an error message.
 * @returns {Promise<void>} - A promise that resolves when the events are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the events from the database.
 */
exports.getAllEvents = async (req, res) => {
  const { eventType, userId, dateFrom, dateTo } = req.query;
  let query =
    "SELECT eventId, userId, eventType, data, timestamp FROM events WHERE 1=1";
  const params = [];

  if (eventType) {
    query += " AND eventType = ?";
    params.push(eventType);
  }
  if (userId) {
    query += " AND userId = ?";
    params.push(userId);
  }
  if (dateFrom) {
    query += " AND timestamp >= ?";
    params.push(dateFrom);
  }
  if (dateTo) {
    query += " AND timestamp <= ?";
    params.push(dateTo);
  }

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Get an overview of events, including total events, number of uploads, exports, tool uses, and keyboard shortcuts. Executes a SQL query to aggregate the event data and returns the overview in the response.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the events overview or an error message.
 * @returns {Promise<void>} - A promise that resolves when the events overview is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the events overview from the database.
 *
 * {totalEvents, numberOfUploads, numberOfExport, numberOfUseTool, numberOfKeyboardShortcuts}
 */
exports.getEventsOverview = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) AS totalEvents,
        SUM(eventType = 'uploadImage') AS numberOfUploads,
        SUM(eventType = 'exportImage') AS numberOfExport,
        SUM(eventType = 'keyboardShortcuts') AS numberOfKeyboardShortcuts,
        SUM(eventType = 'applyOperation') AS numberOfUseTool
      FROM events
    `);

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching events overview:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get toggleTool events with a count of how many times each tool was toggled.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the toggleTool events or an error message.
 * @returns {Promise<void>} - A promise that resolves when the toggleTool events are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the toggleTool events from the database.
 *
 * [{tool, tab, numberOfToggles}, ...]
 */
exports.getToggleToolEvents = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.tool')) AS tool,
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.tab')) AS tab,
        COUNT(*) AS numberOfToggles
      FROM events
      WHERE eventType = 'toggleTool'
      GROUP BY tool, tab
      ORDER BY numberOfToggles DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching toggleTool events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get applyOperation events with a count of how many times each tool was applied.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the applyOperation events or an error message.
 * @returns {Promise<void>} - A promise that resolves when the applyOperation events are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the applyOperation events from the database.
 *
 * [{tool, numberOfApplies}, ...]
 */
exports.getApplyOperationEvents = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.tool')) AS tool,
        COUNT(*) AS numberOfApplies
      FROM events
      WHERE eventType = 'applyOperation'
      GROUP BY tool
      ORDER BY numberOfApplies DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching applyOperation events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get uploadImage events with a count of how many times each file format was uploaded.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the uploadImage events or an error message.
 * @returns {Promise<void>} - A promise that resolves when the uploadImage events are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the uploadImage events from the database.
 *
 * [{fileFormat, numberOfUploads}, ...]
 */
exports.getUploadImageEvents = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.fileFormat')) AS fileFormat,
        COUNT(*) AS numberOfUploads
      FROM events
      WHERE eventType = 'uploadImage'
      GROUP BY fileFormat
      ORDER BY numberOfUploads DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching uploadImage events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get exportImage events with a count of how many times each file format was exported, including a virtual "copyToClipboard" format for copy to clipboard actions. Executes a SQL query that combines standard export events and copy to clipboard events, aggregates the counts by file format, and returns the results in the response.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the exportImage events or an error message.
 * @returns {Promise<void>} - A promise that resolves when the exportImage events are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the exportImage events from the database.
 *
 * [{fileFormat, numberOfExports}, ...]
 */
exports.getExportImageEvents = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        fileFormat,
        CAST(SUM(numberOfExports) AS UNSIGNED) AS numberOfExports
      FROM (
        -- Standard exportImage events
        SELECT 
          JSON_UNQUOTE(JSON_EXTRACT(data, '$.fileFormat')) AS fileFormat,
          COUNT(*) AS numberOfExports
        FROM events
        WHERE eventType = 'exportImage'
        GROUP BY fileFormat

        UNION ALL

        -- Copy to clipboard as virtual export format
        SELECT
          'copyToClipboard' AS fileFormat,
          COUNT(*) AS numberOfExports
        FROM events
        WHERE eventType = 'buttonClicked'
          AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.button')) = 'copyImageToClipboard'
      ) AS combined
      GROUP BY fileFormat
      ORDER BY numberOfExports DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching export events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get openModal events with a count of how many times each modal was opened.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the openModal events or an error message.
 * @returns {Promise<void>} - A promise that resolves when the openModal events are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the openModal events from the database.
 *
 * [{modal, numberOfOpens}, ...]
 */
exports.getOpenModalEvents = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.modal')) AS modal,
        COUNT(*) AS numberOfOpens
      FROM events
      WHERE eventType = 'openModal'
      GROUP BY modal
      ORDER BY numberOfOpens DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching openModal events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get keyboardShortcuts events with a count of how many times each shortcut was used.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the keyboardShortcuts events or an error message.
 * @returns {Promise<void>} - A promise that resolves when the keyboardShortcuts events are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the keyboardShortcuts events from the database.
 *
 * [{keys, numberOfShortcuts}, ...]
 */
exports.getKeyboardShortcutsEvents = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.keys')) AS \`keys\`,
        COUNT(*) AS numberOfShortcuts
      FROM events
      WHERE eventType = 'keyboardShortcuts'
      GROUP BY \`keys\`
      ORDER BY numberOfShortcuts DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching keyboardShortcuts events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get events number by user.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the events or an error message.
 * @returns {Promise<void>} - A promise that resolves when the events are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the events from the database.
 *
 * [{userId, importCount, exportCount, operationCount, toolToggleCount, keyboardShortcutsCount, allEventsCount}, ...]
 */
exports.getEventsByUser = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        userId,
        SUM(eventType = 'uploadImage') AS importCount,

        SUM(
          eventType = 'exportImage'
          OR (
            eventType = 'buttonClicked' 
            AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.button')) = 'copyImageToClipboard'
          )
        ) AS exportCount,

        SUM(eventType = 'applyOperation') AS operationCount,
        SUM(eventType = 'toggleTool') AS toolToggleCount,
        SUM(eventType = 'keyboardShortcuts') AS keyboardShortcutsCount,
        COUNT(*) AS allEventsCount
      FROM events
      GROUP BY userId
      ORDER BY importCount DESC, exportCount DESC, operationCount DESC, toolToggleCount DESC;
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching events by user:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get app installed count.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the app installed count or an error message.
 * @returns {Promise<void>} - A promise that resolves when the app installed count is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the app installed count from the database.
 *
 * {appInstalledCount: number}
 */
exports.getAppInstalledCount = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(DISTINCT userId) AS appInstalledCount
      FROM events
      WHERE eventType = 'appInstalled'
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching app installed count:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get average app rating and total ratings count.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the average app rating and total ratings count or an error message.
 * @returns {Promise<void>} - A promise that resolves when the average app rating and total ratings count are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the average app rating and total ratings count from the database.
 *
 * {averageRating: number, totalRatings: number}
 */
exports.getAppRating = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        AVG(rating) AS averageRating,
        COUNT(*) AS totalRatings
      FROM ratings
    `);

    res.json({
      averageRating: rows[0].averageRating,
      totalRatings: rows[0].totalRatings,
    });
  } catch (err) {
    console.error("Error fetching average app rating:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
