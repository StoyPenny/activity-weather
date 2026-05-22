/**
 * Database schema definitions and initialization.
 *
 * Schema overview:
 *   users    – one row per device (UUID sent by client in X-Device-ID header)
 *   settings – one row per user, stores all activity/unit/theme preferences as JSON
 */

/** Default settings matching the frontend DEFAULT_SETTINGS (settings.js v4). */
const DEFAULT_SETTINGS = {
  version: 4,
  unitPreference: 'metric',
  themePreference: 'light',
  activities: [
    'Surfing',
    'Fishing',
    'Boating',
    'Hiking',
    'Camping',
    'Beach Day',
    'Kayaking',
    'Snorkeling',
  ],
  activityParams: {
    Surfing: {
      swellHeight: { type: 'normalize', optimal: 1.5, range: 1.5 },
      swellPeriod: { type: 'normalize', optimal: 8, range: 4 },
      windSpeed:   { type: 'normalize', optimal: 3, range: 5 },
    },
    Fishing: {
      windSpeed:  { type: 'inverse', max: 10 },
      cloudCover: { type: 'normalize', optimal: 40, range: 30 },
    },
    Boating: {
      windSpeed:  { type: 'inverse', max: 12 },
      waveHeight: { type: 'inverse', max: 1 },
    },
    Hiking: {
      airTemperature: { type: 'normalize', optimal: 22, range: 10 },
      windSpeed:      { type: 'inverse', max: 10 },
      cloudCover:     { type: 'inverse', max: 80 },
    },
    Camping: {
      airTemperature: { type: 'normalize', optimal: 20, range: 10 },
      windSpeed:      { type: 'inverse', max: 8 },
      cloudCover:     { type: 'inverse', max: 90 },
    },
    'Beach Day': {
      airTemperature: { type: 'normalize', optimal: 28, range: 8 },
      windSpeed:      { type: 'normalize', optimal: 4, range: 6 },
      cloudCover:     { type: 'normalize', optimal: 15, range: 20 },
    },
    Kayaking: {
      windSpeed:  { type: 'inverse', max: 6 },
      waveHeight: { type: 'inverse', max: 0.5 },
    },
    Snorkeling: {
      waterTemperature: { type: 'normalize', optimal: 26, range: 6 },
      waveHeight:       { type: 'inverse', max: 0.3 },
    },
  },
};

/**
 * Initialize the database schema (idempotent — safe to call on every startup).
 * @param {import('sqlite').Database} db
 */
async function initializeSchema(db) {
  await db.exec(`
    -- Device-based identity; no passwords required
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,                          -- UUID from client X-Device-ID header
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- One settings row per user; preferences stored as JSON blobs
    CREATE TABLE IF NOT EXISTS settings (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          TEXT    NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      version          INTEGER NOT NULL DEFAULT 4,
      unit_preference  TEXT    NOT NULL DEFAULT 'metric'
                         CHECK (unit_preference IN ('metric', 'imperial')),
      theme_preference TEXT    NOT NULL DEFAULT 'light'
                         CHECK (theme_preference IN ('light', 'dark')),
      activities       TEXT    NOT NULL DEFAULT '[]',        -- JSON array of activity names
      activity_params  TEXT    NOT NULL DEFAULT '{}',        -- JSON object of per-activity params
      last_updated     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Index for the common "look up settings by user" query
    CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
  `);
}

module.exports = { initializeSchema, DEFAULT_SETTINGS };
