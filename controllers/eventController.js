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

// Get applyOperation events
// [{tool, numberOfApplies}, ...]
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

// Get uploadImage events
// [{fileFormat, numberOfUploads}, ...]
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

// Get exportImage events including copy to clipboard
// [{fileFormat, numberOfExports}, ...]
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

// Get keyboardShortcuts events
// [{keys, numberOfShortcuts}, ...]
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

// Get events number by user
// [{userId, importCount, exportCount, operationCount, toolToggleCount, keyboardShortcutsCount, allEventsCount}, ...]
exports.getEventsByUser = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        userId,
        SUM(eventType = 'uploadImage') AS importCount,
        SUM(eventType IN ('exportImage', 'buttonClicked') AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.button')) = 'copyImageToClipboard') AS exportCount,
        SUM(eventType = 'applyOperation') AS operationCount,
        SUM(eventType = 'toggleTool') AS toolToggleCount,
        SUM(eventType = 'keyboardShortcuts') AS keyboardShortcutsCount,
        COUNT(*) AS allEventsCount
      FROM events
      GROUP BY userId
      ORDER BY importCount DESC, exportCount DESC, operationCount DESC, toolToggleCount DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching events by user:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get app installed count
// {appInstalledCount: number}
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
