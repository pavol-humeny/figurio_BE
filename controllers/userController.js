/**
 * @file: userController.js
 * @author Pavol Humeny
 * @date 15.5.2026
 * @description: Controller for handling user-related API endpoints, including fetching user data, visits, events, sessions, and comparisons for the Figurio application. Contains functions to interact with the database and return user-specific statistics and information.
 */

const db = require("../services/db");
const geoip = require("geoip-lite");

/**
 * Get all users and their visit counts.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the user data or an error message.
 * @returns {Promise<void>} - A promise that resolves when the user data is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the user data from the database.
 *
 * [{userId, visitCount}, ...]
 */
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

/**
 * Get visits for a specific user.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the user visits or an error message.
 * @returns {Promise<void>} - A promise that resolves when the user visits are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the user visits from the database.
 *
 * [{visitId, timestamp, ip, userAgent, country, city}, ...]
 */
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

/**
 * Add a visit for a specific user.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the result or an error message.
 * @returns {Promise<void>} - A promise that resolves when the visit is added or an error occurs.
 * @throws Will send a 500 status code if there is an error adding the visit to the database.
 */
exports.addUserVisit = async (req, res) => {
  const userId = req.params.userId;
  const ipFromClient = req.body.ip; // FE send IP
  const isPWA = req.body.isPWA; // FE send isPWA flag (optional)

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
      "INSERT INTO visits (userId, ip, userAgent, country, city, isPWA) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, ip, userAgent, country, city, isPWA],
    );

    console.log(
      `[DEBUG] Visit saved for user ${userId} from IP ${ip} (${country}, ${city}) with UA: ${userAgent} and isPWA: ${isPWA}`,
    );
    res.status(201).send("Visit saved");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Get events for a specific user.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the user events or an error message.
 * @returns {Promise<void>} - A promise that resolves when the user events are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the user events from the database.
 *
 * [{eventId, eventType, data, timestamp}, ...]
 */
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

/**
 * Add an event for a specific user.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the result or an error message.
 * @returns {Promise<void>} - A promise that resolves when the event is added or an error occurs.
 * @throws Will send a 500 status code if there is an error adding the event to the database.
 */
exports.addUserEvent = async (req, res) => {
  const userId = req.params.userId;
  const { eventType, data } = req.body;
  try {
    await db.query(
      "INSERT INTO events (userId, eventType, data) VALUES (?, ?, ?)",
      [userId, eventType, JSON.stringify(data)],
    );
    res.status(201).send("Event saved");
    console.log(
      `[DEBUG] Event saved for user ${userId}: ${eventType} with data: ${JSON.stringify(data)}`,
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Add or update a user session.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the result or an error message.
 * @returns {Promise<void>} - A promise that resolves when the session is added or updated or an error occurs.
 * @throws Will send a 500 status code if there is an error adding or updating the session in the database.
 */
exports.addUserSession = async (req, res) => {
  const userId = req.params.userId;
  const { sessionId, incrementMs } = req.body;

  if (!sessionId || !incrementMs) {
    return res.status(400).send("Missing sessionId or incrementMs");
  }

  try {
    await db.query(
      `
      INSERT INTO sessions (sessionId, userId, durationMs, lastHeartbeat)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        durationMs = durationMs + VALUES(durationMs),
        lastHeartbeat = CURRENT_TIMESTAMP
      `,
      [sessionId, userId, incrementMs],
    );

    console.log(
      `[DEBUG] Session heartbeat user=${userId} session=${sessionId} +${incrementMs}ms`,
    );

    res.status(200).send("Session updated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Get sessions for a specific user.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the user sessions or an error message.
 * @returns {Promise<void>} - A promise that resolves when the user sessions are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the user sessions from the database.
 *
 * [{date, allVisits, minSession, maxSession, avgSession}, ...]
 */
exports.getUserSessions = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        v.date,
        v.allVisits,

        ROUND(MIN(s.durationMs) / 60000, 2) AS minSession,
        ROUND(MAX(s.durationMs) / 60000, 2) AS maxSession,
        ROUND(AVG(s.durationMs) / 60000, 2) AS avgSession

      FROM (
        SELECT
          DATE(timestamp) AS date,
          COUNT(DISTINCT visitId) AS allVisits
        FROM visits
        GROUP BY DATE(timestamp)
      ) v

      LEFT JOIN (
        SELECT
          DATE(timestamp) AS date,
          durationMs
        FROM sessions
      ) s
        ON s.date = v.date

      GROUP BY v.date
      ORDER BY v.date DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Get session duration by user.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the session duration data or an error message.
 * @returns {Promise<void>} - A promise that resolves when the session duration data is fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the session duration data from the database.
 *
 * [{ userId, minSession, maxSession, avgSession, totalSessionsTime }, ...]
 */
exports.getSessionDurationByUser = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        userId,
        ROUND(MIN(durationMs) / 60000, 2) AS minSession,
        ROUND(MAX(durationMs) / 60000, 2) AS maxSession,
        ROUND(AVG(durationMs) / 60000, 2) AS avgSession,
        SUM(durationMs) / 60000 AS totalSessionsTime
      FROM sessions
      GROUP BY userId
      ORDER BY avgSession DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Get visit statistics for a specific user.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the user visit statistics or an error message.
 * @returns {Promise<void>} - A promise that resolves when the user visit statistics are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the user visit statistics from the database.
 *
 * {
 *   totalVisits: 123,
 *   activeDays: 25,
 *   longestStreak: 7,
 *   firstVisit: "12/02/2026"
 * }
 */
exports.getUserVisits = async (req, res) => {
  const userId = req.params.userId;

  /**
   * Format date to DD.MM.YYYY
   */
  const formatDate = (date) => {
    if (!date) return null;

    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}.${month}.${year}`;
  };

  try {
    // 1. Basic stats
    const [[basic]] = await db.query(
      `
      SELECT
        COUNT(*) AS totalVisits,
        COUNT(DISTINCT DATE(timestamp)) AS activeDays,
        MIN(timestamp) AS firstVisit
      FROM visits
      WHERE userId = ?
      `,
      [userId],
    );

    // 2. Visits per day (needed for streak)
    const [visitsPerDay] = await db.query(
      `
      SELECT DATE(timestamp) AS date
      FROM visits
      WHERE userId = ?
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
      `,
      [userId],
    );

    // 3. Longest streak
    let longestStreak = 0;
    let currentStreak = 0;

    for (let i = 0; i < visitsPerDay.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prev = new Date(visitsPerDay[i - 1].date);
        const curr = new Date(visitsPerDay[i].date);

        const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }

    res.json({
      totalVisits: basic.totalVisits,
      activeDays: basic.activeDays,
      longestStreak,
      firstVisit: formatDate(basic.firstVisit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Get user tool usage statistics.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the user tool usage statistics or an error message.
 * @returns {Promise<void>} - A promise that resolves when the user tool usage statistics are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the user tool usage statistics from the database.
 *
 * {
 *   totalInteractions: 123,
 *   tools: [
 *     { tool: "crop", usage: 45, percentage: 36 },
 *     { tool: "rotate", usage: 30, percentage: 24 },
 *     ...
 *   ]
 * }
 */
exports.getUserToolUsage = async (req, res) => {
  const userId = req.params.userId;

  try {
    const [rows] = await db.query(
      `
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.tool')) AS tool,
        COUNT(*) AS usageCount
      FROM events
      WHERE userId = ?
        AND eventType IN ('toggleTool', 'applyOperation')
        AND JSON_EXTRACT(data, '$.tool') IS NOT NULL
      GROUP BY tool
      ORDER BY usageCount DESC
      `,
      [userId],
    );

    // Total interactions
    const total = rows.reduce((sum, r) => sum + r.usageCount, 0);

    // Normalize to percentage (0–100)
    const normalized = rows.map((r) => ({
      tool: r.tool,
      usage: r.usageCount,
      percentage: total > 0 ? Math.round((r.usageCount / total) * 100) : 0,
    }));

    res.json({
      totalInteractions: total,
      tools: normalized,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Get user events statistics.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the user events statistics or an error message.
 * @returns {Promise<void>} - A promise that resolves when the user events statistics are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the user events statistics from the database.
 *
 * {
 *   totalEvents: 123,
 *   rank: 5,
 *   import: {
 *     total: 50,
 *     formats: [
 *       { format: "jpg", count: 30 },
 *       { format: "png", count: 20 },
 *       ...
 *     ],
 *     smallestPx: { width: 100, height: 100 },
 *     largestPx: { width: 4000, height: 3000 },
 *     sizeStats: { minSize: 10, maxSize: 5000 }
 *   },
 *   export: {
 *     total: 70,
 *     formats: [
 *       { format: "jpg", count: 40 },
 *       { format: "png", count: 20 },
 *       { format: "copyToClipboard", count: 10 },
 *       ...
 *     ],
 *     smallestPx: { width: 100, height: 100 },
 *     largestPx: { width: 4000, height: 3000 },
 *     sizeStats: { minSize: 10, maxSize: 5000 }
 *   }
 * }
 */
exports.getUserEventsStats = async (req, res) => {
  const userId = req.params.userId;

  try {
    // Total events and ranking
    const [[userTotal]] = await db.query(
      `
      SELECT COUNT(*) AS totalEvents
      FROM events
      WHERE userId = ?`,
      [userId],
    );

    const [ranking] = await db.query(`
      SELECT userId, COUNT(*) AS totalEvents
      FROM events
      GROUP BY userId
      ORDER BY totalEvents DESC
    `);

    const rankIndex = ranking.findIndex((u) => u.userId === userId);
    const rank = rankIndex !== -1 ? rankIndex + 1 : null;

    // Import (uploadImage)
    const [imports] = await db.query(
      `
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.fileFormat')) AS format,
        COUNT(*) AS count
      FROM events
      WHERE userId = ?
        AND eventType = 'uploadImage'
        AND JSON_EXTRACT(data, '$.fileFormat') IS NOT NULL
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(data, '$.fileFormat'))
      `,
      [userId],
    );

    // Pixel size
    const [[importSmallestPx]] = await db.query(
      `
      SELECT
        JSON_EXTRACT(data, '$.fileWidth') AS width,
        JSON_EXTRACT(data, '$.fileHeight') AS height
      FROM events
      WHERE userId = ?
        AND eventType = 'uploadImage'
      ORDER BY (JSON_EXTRACT(data, '$.fileWidth') * JSON_EXTRACT(data, '$.fileHeight')) ASC
      LIMIT 1
      `,
      [userId],
    );

    const [[importLargestPx]] = await db.query(
      `
      SELECT
        JSON_EXTRACT(data, '$.fileWidth') AS width,
        JSON_EXTRACT(data, '$.fileHeight') AS height
      FROM events
      WHERE userId = ?
        AND eventType = 'uploadImage'
      ORDER BY (JSON_EXTRACT(data, '$.fileWidth') * JSON_EXTRACT(data, '$.fileHeight')) DESC
      LIMIT 1
      `,
      [userId],
    );

    // File size
    const [[importSizeStats]] = await db.query(
      `
      SELECT
        MIN(JSON_EXTRACT(data, '$.fileSize')) AS minSize,
        MAX(JSON_EXTRACT(data, '$.fileSize')) AS maxSize
      FROM events
      WHERE userId = ?
        AND eventType = 'uploadImage'
      `,
      [userId],
    );

    const importTotal = imports.reduce((sum, r) => sum + r.count, 0);

    // Export (exportImage + copyToClipboard)
    const [exportsData] = await db.query(
      `
      SELECT
        fileFormat AS format,
        COUNT(*) AS count
      FROM (
        SELECT 
          JSON_UNQUOTE(JSON_EXTRACT(data, '$.fileFormat')) AS fileFormat
        FROM events
        WHERE userId = ?
          AND eventType = 'exportImage'
          AND JSON_EXTRACT(data, '$.fileFormat') IS NOT NULL

        UNION ALL

        SELECT
          'copyToClipboard' AS fileFormat
        FROM events
        WHERE userId = ?
          AND eventType = 'buttonClicked'
          AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.button')) = 'copyImageToClipboard'
      ) AS combined
      GROUP BY fileFormat
      `,
      [userId, userId],
    );

    // Pixel size
    const [[exportSmallestPx]] = await db.query(
      `
      SELECT
        JSON_EXTRACT(data, '$.fileWidth') AS width,
        JSON_EXTRACT(data, '$.fileHeight') AS height
      FROM events
      WHERE userId = ?
        AND eventType = 'exportImage'
      ORDER BY (JSON_EXTRACT(data, '$.fileWidth') * JSON_EXTRACT(data, '$.fileHeight')) ASC
      LIMIT 1
      `,
      [userId],
    );

    const [[exportLargestPx]] = await db.query(
      `
      SELECT
        JSON_EXTRACT(data, '$.fileWidth') AS width,
        JSON_EXTRACT(data, '$.fileHeight') AS height
      FROM events
      WHERE userId = ?
        AND eventType = 'exportImage'
      ORDER BY (JSON_EXTRACT(data, '$.fileWidth') * JSON_EXTRACT(data, '$.fileHeight')) DESC
      LIMIT 1
      `,
      [userId],
    );

    // File size
    const [[exportSizeStats]] = await db.query(
      `
      SELECT
        MIN(JSON_EXTRACT(data, '$.fileSize')) AS minSize,
        MAX(JSON_EXTRACT(data, '$.fileSize')) AS maxSize
      FROM events
      WHERE userId = ?
        AND eventType = 'exportImage'
      `,
      [userId],
    );

    const exportTotal = exportsData.reduce((sum, r) => sum + r.count, 0);

    // Response
    res.json({
      totalEvents: userTotal.totalEvents,
      rank,

      import: {
        total: importTotal,
        formats: imports.map((r) => ({
          format: r.format,
          count: r.count,
        })),

        // Pixels
        smallest: importSmallestPx
          ? {
              width: importSmallestPx.width,
              height: importSmallestPx.height,
            }
          : null,

        largest: importLargestPx
          ? {
              width: importLargestPx.width,
              height: importLargestPx.height,
            }
          : null,

        // File size (KB)
        smallestBySize:
          importSizeStats?.minSize != null
            ? { sizeKB: Math.round(importSizeStats.minSize / 1024) }
            : null,

        largestBySize:
          importSizeStats?.maxSize != null
            ? { sizeKB: Math.round(importSizeStats.maxSize / 1024) }
            : null,
      },

      export: {
        total: exportTotal,
        formats: exportsData.map((r) => ({
          format: r.format,
          count: r.count,
        })),

        // Pixels
        smallest: exportSmallestPx
          ? {
              width: exportSmallestPx.width,
              height: exportSmallestPx.height,
            }
          : null,

        largest: exportLargestPx
          ? {
              width: exportLargestPx.width,
              height: exportLargestPx.height,
            }
          : null,

        // File size (KB)
        smallestBySize:
          exportSizeStats?.minSize != null
            ? { sizeKB: Math.round(exportSizeStats.minSize / 1024) }
            : null,

        largestBySize:
          exportSizeStats?.maxSize != null
            ? { sizeKB: Math.round(exportSizeStats.maxSize / 1024) }
            : null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Get user session statistics.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the user session statistics or an error message.
 * @returns {Promise<void>} - A promise that resolves when the user session statistics are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the user session statistics from the database.
 *
 * {
 *   sessionCount: 10,
 *   sessionDuration: { min: 5, max: 120, avg: 45, total: 450 },
 *   totalEvents: 200,
 *   eventsPerMinute: 4.44,
 *   perSession: {
 *     import: 2,
 *     export: 1,
 *     toolToggle: 5,
 *     operation: 10
 *   },
 *   keyboardShortcuts: 15
 * }
 */
exports.getUserSessionStats = async (req, res) => {
  const userId = req.params.userId;

  try {
    // Sessions
    const [sessions] = await db.query(
      `
      SELECT durationMs
      FROM sessions
      WHERE userId = ?
      `,
      [userId],
    );

    const sessionCount = sessions.length;

    // Convert duration to minutes
    const durationsMin = sessions.map((s) => s.durationMs / 1000 / 60);

    const totalDuration = durationsMin.reduce((sum, d) => sum + d, 0);
    const minDuration = durationsMin.length ? Math.min(...durationsMin) : 0;
    const maxDuration = durationsMin.length ? Math.max(...durationsMin) : 0;
    const avgDuration = durationsMin.length
      ? totalDuration / durationsMin.length
      : 0;

    // Events
    const [[events]] = await db.query(
      `
      SELECT
        COUNT(*) AS totalEvents,
        SUM(eventType = 'uploadImage') AS importCount,
        SUM(eventType = 'exportImage') AS exportCount,
        SUM(eventType = 'toggleTool') AS toolToggleCount,
        SUM(eventType = 'keyboardShortcuts') AS keyboardShortcutCount,
        SUM(eventType NOT IN ('uploadImage', 'exportImage', 'toggleTool', 'keyboardShortcuts')) AS operationCount
      FROM events
      WHERE userId = ?
      `,
      [userId],
    );

    const totalEvents = events.totalEvents || 0;
    const totalImport = events.importCount || 0;
    const totalExport = events.exportCount || 0;
    const totalToolToggle = events.toolToggleCount || 0;
    const totalKeyboard = events.keyboardShortcutCount || 0;
    const totalOperation = events.operationCount || 0;

    // Per session averages
    const safeDivide = (value) => (sessionCount > 0 ? value / sessionCount : 0);

    const importPerSession = safeDivide(totalImport);
    const exportPerSession = safeDivide(totalExport);
    const toolTogglePerSession = safeDivide(totalToolToggle);
    const operationPerSession = safeDivide(totalOperation);

    // Events per minute
    const totalMinutes = totalDuration;

    const eventsPerMinute = totalMinutes > 0 ? totalEvents / totalMinutes : 0;

    // Response
    res.json({
      sessionCount,

      sessionDuration: {
        min: Number(minDuration.toFixed(2)),
        max: Number(maxDuration.toFixed(2)),
        avg: Number(avgDuration.toFixed(2)),
        total: Number(totalDuration.toFixed(2)),
      },

      totalEvents,

      eventsPerMinute: Number(eventsPerMinute.toFixed(2)),

      perSession: {
        import: Number(importPerSession.toFixed(2)),
        export: Number(exportPerSession.toFixed(2)),
        toolToggle: Number(toolTogglePerSession.toFixed(2)),
        operation: Number(operationPerSession.toFixed(2)),
      },

      keyboardShortcuts: totalKeyboard,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

/**
 * Get user comparison metrics.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object used to send back the user comparison metrics or an error message.
 * @returns {Promise<void>} - A promise that resolves when the user comparison metrics are fetched and sent in the response or an error occurs.
 * @throws Will send a 500 status code if there is an error fetching the user comparison metrics from the database.
 *
 * {
 *   usersCount: 100,
 *   metrics: {
 *     visits: { value: 10, best: 50, rank: 5 },
 *     operations: { value: 20, best: 100, rank: 10 },
 *     operationPerSession: { value: 5, best: 10, rank: 8 },
 *     importCount: { value: 2, best: 20, rank: 15 },
 *     exportCount: { value: 1, best: 15, rank: 20 },
 *     sessionTimeTotal: { value: 60, best: 300, rank: 12 },
 *     eventsPerMinute: { value: 3, best: 10, rank: 7 },
 *     exportRate: { value: 50, best: 90, rank: 18 }
 *   }
 * }
 */
exports.getUserComparison = async (req, res) => {
  const userId = req.params.userId;

  /**
   * Excluded users
   */
  const excludedUserIds = [
    "2bfee4b4-44b3-451f-9f34-92934025b66d",
    "5ed20eea-489a-4edb-81e1-803e3d2e1411",
  ];

  try {
    // Build exclusion SQL
    const exclusionSql =
      excludedUserIds.length > 0
        ? `WHERE u.userId NOT IN (${excludedUserIds.map(() => "?").join(",")})`
        : "";

    const params = [...excludedUserIds];

    // Main query to get all metrics in one go for all users
    const [rows] = await db.query(
      `
      SELECT
        u.userId,

        -- Visits
        (SELECT COUNT(*) FROM visits v WHERE v.userId = u.userId) AS visitCount,

        -- Total events
        (SELECT COUNT(*) FROM events e WHERE e.userId = u.userId) AS totalEvents,

        -- Operations
        (SELECT COUNT(*) FROM events e 
          WHERE e.userId = u.userId
          AND e.eventType = 'applyOperation'
        ) AS operationCount,

        -- Import
        (SELECT COUNT(*) FROM events e 
          WHERE e.userId = u.userId
          AND e.eventType = 'uploadImage'
        ) AS importCount,

        -- Export
        (SELECT COUNT(*) FROM events e 
          WHERE e.userId = u.userId
          AND e.eventType = 'exportImage'
        ) AS exportCount,

        -- Sessions
        (SELECT COUNT(*) FROM sessions s WHERE s.userId = u.userId) AS sessionCount,

        -- Total session time (minutes)
        COALESCE((SELECT SUM(durationMs) FROM sessions s WHERE s.userId = u.userId), 0) / 60000 AS sessionTimeTotal,

        -- Operation per session
        (
          CASE 
            WHEN (SELECT COUNT(*) FROM sessions s WHERE s.userId = u.userId) > 0
            THEN
              (SELECT COUNT(*) FROM events e 
                WHERE e.userId = u.userId
                AND e.eventType NOT IN ('uploadImage','exportImage','toggleTool','keyboardShortcuts')
              ) 
              /
              (SELECT COUNT(*) FROM sessions s WHERE s.userId = u.userId)
            ELSE 0
          END
        ) AS operationPerSession,

        -- Events per minute
        (
          CASE 
            WHEN (SELECT SUM(durationMs) FROM sessions s WHERE s.userId = u.userId) > 0
            THEN
              (SELECT COUNT(*) FROM events e WHERE e.userId = u.userId)
              /
              (COALESCE((SELECT SUM(durationMs) FROM sessions s WHERE s.userId = u.userId), 0) / 60000)
            ELSE 0
          END
        ) AS eventsPerMinute,

        -- Export success rate (export / import)
        ROUND(
          (
            CASE 
              WHEN (SELECT COUNT(*) FROM events e 
                    WHERE e.userId = u.userId AND e.eventType = 'uploadImage') > 0
              THEN
                (SELECT COUNT(*) FROM events e 
                  WHERE e.userId = u.userId AND e.eventType = 'exportImage') * 100.0
                /
                (SELECT COUNT(*) FROM events e 
                  WHERE e.userId = u.userId AND e.eventType = 'uploadImage')
              ELSE 0
            END
          ),
          2
        ) AS exportRate

      FROM users u
      `,
      params,
    );

    /**
     * Helper to convert value to number and handle NaN
     * @param {any} val - The value to convert to a number.
     * @returns {number} - The converted number or 0 if the value is not a valid number.
     */
    const toNumber = (val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    /**
     * Ranking helper
     * @param {string} key - The metric key for which to build the ranking.
     * @returns {Object} - The ranking information for the specified metric.
     */
    const buildMetric = (key) => {
      // Exclude users ONLY for ranking (not current user)
      const filtered = rows.filter(
        (u) => !excludedUserIds.includes(u.userId) || u.userId === userId,
      );

      const sorted = [...filtered].sort(
        (a, b) => toNumber(b[key]) - toNumber(a[key]),
      );

      const best = toNumber(sorted[0]?.[key]);

      const rankIndex = sorted.findIndex((u) => u.userId === userId);
      const rank = rankIndex !== -1 ? rankIndex + 1 : null;

      const userRow = rows.find((u) => u.userId === userId);

      const value = toNumber(userRow?.[key]);

      return {
        value: Number(value.toFixed(2)),
        best: Number(best.toFixed(2)),
        rank,
      };
    };

    // Response
    res.json({
      usersCount: rows.length,

      metrics: {
        visits: buildMetric("visitCount"),
        operations: buildMetric("operationCount"),
        operationPerSession: buildMetric("operationPerSession"),
        importCount: buildMetric("importCount"),
        exportCount: buildMetric("exportCount"),
        sessionTimeTotal: buildMetric("sessionTimeTotal"),
        eventsPerMinute: buildMetric("eventsPerMinute"),
        exportRate: buildMetric("exportRate"),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
