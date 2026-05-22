/**
 * Settings API routes.
 *
 * All requests must include an X-Device-ID header (UUID string) that identifies
 * the calling device. No passwords — device ID is the sole identity token.
 *
 * GET  /api/settings  — return settings for the device; seeds defaults if first visit
 * POST /api/settings  — partial-merge update; returns the final persisted settings
 */

const express = require('express');
const { getDb } = require('../database');
const { DEFAULT_SETTINGS } = require('../database/schema');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a database row (snake_case) to the API response shape (camelCase).
 * @param {object} row
 * @returns {object}
 */
function rowToSettings(row) {
  return {
    version:        row.version,
    unitPreference:  row.unit_preference,
    themePreference: row.theme_preference,
    activities:     JSON.parse(row.activities),
    activityParams: JSON.parse(row.activity_params),
  };
}

/**
 * Upsert the device into the `users` table and refresh last_seen.
 * @param {import('sqlite').Database} db
 * @param {string} deviceId
 */
async function upsertUser(db, deviceId) {
  await db.run(
    `INSERT INTO users (id)
     VALUES (?)
     ON CONFLICT(id) DO UPDATE SET last_seen = CURRENT_TIMESTAMP`,
    [deviceId],
  );
}

/**
 * Insert a settings row seeded from DEFAULT_SETTINGS, then return the row.
 * @param {import('sqlite').Database} db
 * @param {string} deviceId
 * @returns {Promise<object>} settings row
 */
async function seedAndFetchSettings(db, deviceId) {
  await db.run(
    `INSERT INTO settings
       (user_id, version, unit_preference, theme_preference, activities, activity_params)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      deviceId,
      DEFAULT_SETTINGS.version,
      DEFAULT_SETTINGS.unitPreference,
      DEFAULT_SETTINGS.themePreference,
      JSON.stringify(DEFAULT_SETTINGS.activities),
      JSON.stringify(DEFAULT_SETTINGS.activityParams),
    ],
  );
  return db.get('SELECT * FROM settings WHERE user_id = ?', [deviceId]);
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Require a non-empty X-Device-ID header. Attaches `req.deviceId` on success.
 */
function requireDeviceId(req, res, next) {
  const raw = req.headers['x-device-id'];
  const deviceId = typeof raw === 'string' ? raw.trim() : '';

  if (!deviceId) {
    return res.status(400).json({ error: 'X-Device-ID header is required' });
  }
  if (deviceId.length > 128) {
    return res.status(400).json({ error: 'X-Device-ID must be 128 characters or fewer' });
  }

  req.deviceId = deviceId;
  next();
}

// ---------------------------------------------------------------------------
// GET /api/settings
// ---------------------------------------------------------------------------

router.get('/', requireDeviceId, async (req, res, next) => {
  try {
    const db = await getDb();
    await upsertUser(db, req.deviceId);

    let row = await db.get('SELECT * FROM settings WHERE user_id = ?', [req.deviceId]);

    if (!row) {
      row = await seedAndFetchSettings(db, req.deviceId);
    }

    res.json(rowToSettings(row));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/settings
// ---------------------------------------------------------------------------

router.post('/', requireDeviceId, async (req, res, next) => {
  try {
    const db = await getDb();
    await upsertUser(db, req.deviceId);

    const { unitPreference, themePreference, activities, activityParams, version } = req.body;

    // --- Validate incoming fields (only those that are present) ---

    if (unitPreference !== undefined && !['metric', 'imperial'].includes(unitPreference)) {
      return res.status(400).json({ error: 'unitPreference must be "metric" or "imperial"' });
    }

    if (themePreference !== undefined && !['light', 'dark'].includes(themePreference)) {
      return res.status(400).json({ error: 'themePreference must be "light" or "dark"' });
    }

    if (activities !== undefined) {
      if (!Array.isArray(activities) || activities.some(a => typeof a !== 'string')) {
        return res.status(400).json({ error: 'activities must be an array of strings' });
      }
    }

    if (activityParams !== undefined) {
      if (typeof activityParams !== 'object' || activityParams === null || Array.isArray(activityParams)) {
        return res.status(400).json({ error: 'activityParams must be a plain object' });
      }
    }

    if (version !== undefined && (!Number.isInteger(version) || version < 1)) {
      return res.status(400).json({ error: 'version must be a positive integer' });
    }

    // --- Fetch (or seed) current settings to merge against ---

    let current = await db.get('SELECT * FROM settings WHERE user_id = ?', [req.deviceId]);
    if (!current) {
      current = await seedAndFetchSettings(db, req.deviceId);
    }

    // --- Merge incoming fields over current values ---

    await db.run(
      `UPDATE settings SET
         version          = ?,
         unit_preference  = ?,
         theme_preference = ?,
         activities       = ?,
         activity_params  = ?,
         last_updated     = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        version         !== undefined ? version         : current.version,
        unitPreference  !== undefined ? unitPreference  : current.unit_preference,
        themePreference !== undefined ? themePreference : current.theme_preference,
        activities      !== undefined ? JSON.stringify(activities)    : current.activities,
        activityParams  !== undefined ? JSON.stringify(activityParams) : current.activity_params,
        req.deviceId,
      ],
    );

    const updated = await db.get('SELECT * FROM settings WHERE user_id = ?', [req.deviceId]);
    res.json(rowToSettings(updated));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
