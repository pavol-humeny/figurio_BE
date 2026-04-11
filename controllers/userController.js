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
      [userId],
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

// Add / update user session heartbeat
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

// Get session statistics by day
// [{ date, allVisits, minSession, maxSession, avgSession }, ...]
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

// Get session duration by user
// [{ userId, minSession, maxSession, avgSession, totalSessionsTime }, ...]
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

// {
//   "totalVisits": 123,
//   "activeDays": 25,
//   "longestStreak": 7,
//   "firstVisit": "12/02/2026",
// }
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
 * Get tool usage for radar chart
 * Returns usage count per tool for given user
 * Example:
 * {
 *   totalInteractions: 72,
 *   tools: [
 *     { tool: "crop", usage: 34, percentage: 47 },
 *     { tool: "frame", usage: 12, percentage: 17 },
 *     { tool: "magnify", usage: 19, percentage: 26 },
 *     { tool: "blur", usage: 7, percentage: 10 }
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
 * Get user events statistics
 * Example response:
 *  {
 *    "totalEvents": 532,
 *    "rank": 3,
 *    "import": {
 *      "total": 45,
 *      "formats": [
 *        { "format": "png", "count": 20 },
 *        { "format": "jpg", "count": 15 }
 *      ],
 *      "smallest": { "width": 200, "height": 100 },
 *      "largest": { "width": 1920, "height": 1080 },
 *      "smallestBySize": { "sizeKB": 34 },
 *      "largestBySize": { "sizeKB": 820 }
 *    },
 *    "export": {
 *      "total": 38,
 *      "formats": [
 *        { "format": "png", "count": 25 },
 *        { "format": "pdf", "count": 13 }
 *      ],
 *      "smallest": { "width": 300, "height": 200 },
 *      "largest": { "width": 1920, "height": 1080 },
 *      "smallestBySize": { "sizeKB": 28 },
 *      "largestBySize": { "sizeKB": 910 }
 *    }
 *  }
 */
exports.getUserEventsStats = async (req, res) => {
  const userId = req.params.userId;

  try {
    // 1. TOTAL EVENTS + RANK
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

    // 2. IMPORT (uploadImage)
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

    // PIXEL SIZE (independent)
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

    // FILE SIZE (independent)
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

    // 3. EXPORT (exportImage + copyToClipboard)
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

    // PIXEL SIZE (independent)
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

    // FILE SIZE (independent)
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

    // RESPONSE
    res.json({
      totalEvents: userTotal.totalEvents,
      rank,

      import: {
        total: importTotal,
        formats: imports.map((r) => ({
          format: r.format,
          count: r.count,
        })),

        // PIXELS
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

        // FILE SIZE (KB)
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

        // PIXELS
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

        // FILE SIZE (KB)
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
 * Get session statistics for user
 * Example response:
 *  {
      "sessionCount": 12,
      "sessionDuration": {
        "min": 15,
        "max": 320,
        "avg": 85,
        "total": 1020
      },
      "totalEvents": 540,
      "eventsPerMinute": 3.25,
      "perSession": {
        "import": 1.17,
        "export": 0.83,
        "toolToggle": 4.25,
        "operation": 6.91
      },
      "keyboardShortcuts": 120
    }
 */
/**
 * Get session statistics for user
 */
exports.getUserSessionStats = async (req, res) => {
  const userId = req.params.userId;

  try {
    // 1. SESSIONS
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

    // 2. EVENTS (GLOBAL)
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

    // 3. PER SESSION (safe divide)
    const safeDivide = (value) => (sessionCount > 0 ? value / sessionCount : 0);

    const importPerSession = safeDivide(totalImport);
    const exportPerSession = safeDivide(totalExport);
    const toolTogglePerSession = safeDivide(totalToolToggle);
    const operationPerSession = safeDivide(totalOperation);

    // 4. EVENTS PER MINUTE
    const totalMinutes = totalDuration;

    const eventsPerMinute = totalMinutes > 0 ? totalEvents / totalMinutes : 0;

    // RESPONSE
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
 * Compare user stats with others (ranking)
 *
 * Example response:
 * {
 *   "usersCount": 42,
 *   "metrics": {
 *     "visits": { "value": 128, "best": 982, "rank": 6 },
 *     "operations": { "value": 356, "best": 2140, "rank": 4 },
 *     "operationPerSession": { "value": 5.42, "best": 12.87, "rank": 7 },
 *     "importCount": { "value": 48, "best": 310, "rank": 5 },
 *     "exportCount": { "value": 39, "best": 275, "rank": 6 },
 *     "sessionTimeTotal": { "value": 124.75, "best": 980.33, "rank": 8 },
 *     "eventsPerMinute": { "value": 2.85, "best": 6.21, "rank": 9 }
 *     "exportRate": { "value": 0.81, "best": 0.95, "rank": 5 }
 *   }
 * }
 *
 * Body:
 * {
 *   excludedUserIds: ["admin", "testUser"]
 * }
 */
exports.getUserComparison = async (req, res) => {
  const userId = req.params.userId;

  /**
   * Hardcoded excluded users
   */
  const excludedUserIds = ["2bfee4b4-44b3-451f-9f34-92934025b66d"];

  try {
    // Build exclusion SQL
    const exclusionSql =
      excludedUserIds.length > 0
        ? `WHERE u.userId NOT IN (${excludedUserIds.map(() => "?").join(",")})`
        : "";

    const params = [...excludedUserIds];

    /**
     * Aggregate metrics per user
     */
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

    // Converts anything to safe number
    const toNumber = (val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    /**
     * Ranking helper
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

    /**
     * Response
     */
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
