/**
 * @file: db.js
 * @author: Pavol Humeny
 * @date: 15.5.2026
 * @description: Database connection module for the Figurio backend. Uses MySQL and connection pooling for efficient database access.
 */

const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool.promise();
