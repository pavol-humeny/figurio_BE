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
 *     { tool: "crop", usage: 34, percentage: 47, rank: 1 },
 *     { tool: "frame", usage: 12, percentage: 17, rank: 2 },
 *     { tool: "magnify", usage: 19, percentage: 26, rank: 3 },
 *     { tool: "blur", usage: 7, percentage: 10, rank: 4 }
 *   ]
 * }
 */
exports.getUserToolUsage = async (req, res) => {
  const userId = req.params.userId;

  // Excluded user ids
  const excludedUserIds = ["5ed20eea-489a-4edb-81e1-803e3d2e1411"];

  try {
    /**
     * Condition to exclude specific users from ranking
     */
    const placeholders = excludedUserIds.map(() => "?").join(", ");
    const excludeCondition =
      excludedUserIds.length > 0 ? `AND userId NOT IN (${placeholders})` : "";

    /**
     * 1. Rank for all users
     */
    const [rankRows] = await db.query(
      `
      SELECT
        tool,
        userId,
        usageCount,
        RANK() OVER (PARTITION BY tool ORDER BY usageCount DESC) AS rank
      FROM (
        SELECT
          JSON_UNQUOTE(JSON_EXTRACT(data, '$.tool')) AS tool,
          userId,
          COUNT(*) AS usageCount
        FROM events
        WHERE eventType IN ('toggleTool', 'applyOperation')
          AND JSON_EXTRACT(data, '$.tool') IS NOT NULL
          ${excludeCondition}
        GROUP BY tool, userId
      ) t
      `,
      excludedUserIds,
    );

    /**
     * 2. Filter just current user
     */
    const userToolStats = rankRows.filter((r) => r.userId === userId);

    /**
     * 3. Total interactions
     */
    const total = userToolStats.reduce((sum, r) => sum + r.usageCount, 0);

    /**
     * 4. Normalization and rank
     */
    const tools = userToolStats
      .sort((a, b) => b.usageCount - a.usageCount)
      .map((r) => ({
        tool: r.tool,
        usage: r.usageCount,
        percentage: total > 0 ? Math.round((r.usageCount / total) * 100) : 0,
        rank: r.rank,
      }));

    res.json({
      totalInteractions: total,
      tools,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
