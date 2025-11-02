const db = require("../services/db");

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

// Get events overview
// {totalEvents, numberOfUploads, numberOfExport, numberOfUseTool, numberOfKeyboardShortcuts}
exports.getEventsOverview = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) AS totalEvents,
        SUM(eventType = 'fileUpload') AS numberOfUploads,
        SUM(eventType = 'exportImage') AS numberOfExport,
        SUM(eventType = 'toggleTool' OR eventType = 'applyOperation') AS numberOfUseTool,
        SUM(eventType = 'keyBoardShortcut') AS numberOfKeyboardShortcuts
      FROM events
    `);

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching events overview:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get toggleTool events
// [{tool, tab, numberOfToggles}, ...]
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

// Get uploadImage events
// [{fileFormat, numberOfUploads}, ...]
exports.getUploadImageEvents = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.fileFormat')) AS fileFormat,
        COUNT(*) AS numberOfUploads
      FROM events
      WHERE eventType = 'fileUpload'
      GROUP BY fileFormat
      ORDER BY numberOfUploads DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching fileUpload events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get exportImage events
// [{fileFormat, numberOfExports}, ...]
exports.getExportImageEvents = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.fileFormat')) AS fileFormat,
        COUNT(*) AS numberOfExports
      FROM events
      WHERE eventType = 'exportImage'
      GROUP BY fileFormat
      ORDER BY numberOfExports DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching exportImage events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get openModal events
// [{modal, numberOfOpens}, ...]
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

// Get keyBoardShortcut events
// [{keys, numberOfUses}, ...]
exports.getKeyBoardShortcutEvents = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.keys')) AS keys,
        COUNT(*) AS numberOfUses
      FROM events
      WHERE eventType = 'keyBoardShortcut'
      GROUP BY keys
      ORDER BY numberOfUses DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching keyBoardShortcut events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
