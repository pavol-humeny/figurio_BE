const db = require("./services/db");

async function init() {
  try {
    // Drop tables first (in correct order to respect FK constraints)
    await db.query(`DROP TABLE IF EXISTS events`);
    await db.query(`DROP TABLE IF EXISTS visits`);
    await db.query(`DROP TABLE IF EXISTS users`);

    // Users table
    await db.query(`
      CREATE TABLE users (
        userId VARCHAR(255) NOT NULL PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Visits table
    await db.query(`
      CREATE TABLE visits (
        visitId INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip VARCHAR(45),
        userAgent VARCHAR(255),
        country VARCHAR(50),
        city VARCHAR(50),
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      )
    `);

    // Events table
    await db.query(`
      CREATE TABLE events (
        eventId INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        eventType VARCHAR(50) NOT NULL,
        data JSON,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      )
    `);

    console.log("Tables created successfully (all previous data removed)");
    process.exit(0);
  } catch (err) {
    console.error("Error creating tables:", err);
    process.exit(1);
  }
}

init();
