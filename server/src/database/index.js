/**
 * Database connection module.
 *
 * Opens (or creates) the SQLite database at the path configured via DB_PATH,
 * runs schema migrations, and exports a singleton `db` instance.
 *
 * Usage:
 *   const { db } = require('./database');
 *   const row = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
 */

const path = require('node:path');
const fs   = require('node:fs');

let dbInstance = null;

/**
 * Open the SQLite database and initialize the schema.
 * Returns a cached instance on subsequent calls.
 * @returns {Promise<import('sqlite').Database>}
 */
async function getDb() {
  if (dbInstance) return dbInstance;

  // Lazy-require so the module loads even before npm install in tests
  const sqlite3 = require('sqlite3').verbose();
  const { open }  = require('sqlite');
  const { initializeSchema } = require('./schema');

  const dbPath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(__dirname, '..', '..', 'data', 'activity-weather.sqlite');

  // Ensure the data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  dbInstance = await open({ filename: dbPath, driver: sqlite3.Database });

  // Enable WAL mode for better concurrent read performance
  await dbInstance.run('PRAGMA journal_mode = WAL');
  // Enforce foreign key constraints
  await dbInstance.run('PRAGMA foreign_keys = ON');

  await initializeSchema(dbInstance);

  console.log(`[db] Connected: ${dbPath}`);
  return dbInstance;
}

module.exports = { getDb };
