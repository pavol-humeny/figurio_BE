const db = require('./services/db');

async function init() {
  try {
    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        userId VARCHAR(255) NOT NULL PRIMARY KEY,
	timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Visits table
    await db.query(`
      CREATE TABLE IF NOT EXISTS visits (
        visitId INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      )
    `);

    // Events table
    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        eventId INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(50) NOT NULL,
        eventType VARCHAR(50) NOT NULL,
        data JSON,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      )
    `);

    console.log('Tables created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error creating tables:', err);
    process.exit(1);
  }
}

init();
