/**
 * Weather API proxy routes.
 *
 * Proxies requests to the Stormglass API and caches responses server-side so
 * that all clients share a single daily quota budget.
 *
 * GET /api/weather/current?lat=&lng=[&forceRefresh=true]
 * GET /api/weather/forecast?lat=&lng=[&days=ignored][&forceRefresh=true]  — always returns full 10-day payload
 * GET /api/weather/cache  — cache status (debug / monitoring)
 * DELETE /api/weather/cache  — flush all cached entries
 */

const express = require('express');

const router = express.Router();

const STORMGLASS_BASE_URL = 'https://api.stormglass.io/v2/weather/point';

// Full parameter list matching the existing frontend weather.js request.
// Keeping this in sync with the frontend ensures Task 4 (frontend refactor)
// receives all the data it expects without an additional API call.
const WEATHER_PARAMS = [
  'airTemperature',
  'airTemperature80m',
  'airTemperature100m',
  'airTemperature1000hpa',
  'airTemperature800hpa',
  'airTemperature500hpa',
  'airTemperature200hpa',
  'pressure',
  'cloudCover',
  'humidity',
  'dewPointTemperature',
  'visibility',
  'precipitation',
  'rain',
  'snow',
  'graupel',
  'windSpeed',
  'windSpeed20m',
  'windSpeed30m',
  'windSpeed40m',
  'windSpeed50m',
  'windSpeed80m',
  'windSpeed100m',
  'windSpeed1000hpa',
  'windSpeed800hpa',
  'windSpeed500hpa',
  'windSpeed200hpa',
  'windDirection',
  'windDirection20m',
  'windDirection30m',
  'windDirection40m',
  'windDirection50m',
  'windDirection80m',
  'windDirection100m',
  'windDirection1000hpa',
  'windDirection800hpa',
  'windDirection500hpa',
  'windDirection200hpa',
  'gust',
  'waveHeight',
  'waveDirection',
  'wavePeriod',
  'windWaveHeight',
  'windWaveDirection',
  'windWavePeriod',
  'swellHeight',
  'swellDirection',
  'swellPeriod',
  'secondarySwellHeight',
  'secondarySwellDirection',
  'secondarySwellPeriod',
  'waterTemperature',
  'currentSpeed',
  'currentDirection',
  'iceCover',
  'snowDepth',
  'snowAlbedo',
  'seaIceThickness',
  'seaLevel',
];

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

/**
 * @typedef {{ data: object, timestamp: number, location: { lat: number, lng: number }, type: string }} CacheEntry
 */

/** @type {Map<string, CacheEntry>} */
const weatherCache = new Map();

/** Round coordinate to 3 d.p. (~100 m precision) for cache key stability. */
const roundCoord = (n) => Math.round(n * 1000) / 1000;

const buildCacheKey = (lat, lng, type) =>
  `weather_${type}_${roundCoord(lat)}_${roundCoord(lng)}`;

const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Return cached entry if still valid (same calendar day), else null.
 * @param {number} lat
 * @param {number} lng
 * @param {string} type  'current' | 'forecast'
 * @returns {CacheEntry|null}
 */
function getCacheEntry(lat, lng, type) {
  const key = buildCacheKey(lat, lng, type);
  const entry = weatherCache.get(key);
  if (!entry) return null;

  if (isSameCalendarDay(new Date(entry.timestamp), new Date())) {
    return entry;
  }

  // Expired — evict eagerly
  weatherCache.delete(key);
  return null;
}

/**
 * Store a new cache entry.
 * @param {object} data
 * @param {number} lat
 * @param {number} lng
 * @param {string} type
 */
function setCacheEntry(data, lat, lng, type) {
  const key = buildCacheKey(lat, lng, type);
  weatherCache.set(key, { data, timestamp: Date.now(), location: { lat, lng }, type });
}

// Periodic cleanup: remove entries that are no longer from today.
// Runs once per hour; prevents unbounded memory growth across midnight.
setInterval(() => {
  const now = new Date();
  let evicted = 0;
  for (const [key, entry] of weatherCache) {
    if (!isSameCalendarDay(new Date(entry.timestamp), now)) {
      weatherCache.delete(key);
      evicted++;
    }
  }
  if (evicted > 0) {
    console.log(`[weather-cache] Evicted ${evicted} expired entr${evicted === 1 ? 'y' : 'ies'}`);
  }
}, 60 * 60 * 1000).unref(); // .unref() so this timer doesn't keep the process alive

// ---------------------------------------------------------------------------
// Stormglass fetch helper
// ---------------------------------------------------------------------------

/**
 * Fetch weather data from the Stormglass API.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} startMs  Unix milliseconds (start of range)
 * @param {number} endMs    Unix milliseconds (end of range)
 * @returns {Promise<{ hours: object[], meta: object }>}
 * @throws {Error} with `.quotaMeta` set when the daily quota is exceeded
 */
async function fetchFromStormglass(lat, lng, startMs, endMs) {
  const apiKey = process.env.STORMGLASS_API_KEY;
  if (!apiKey) {
    throw new Error('STORMGLASS_API_KEY is not configured on the server');
  }

  const qs = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    params: WEATHER_PARAMS.join(','),
    start: String(Math.floor(startMs / 1000)),
    end:   String(Math.floor(endMs   / 1000)),
  });

  const response = await fetch(`${STORMGLASS_BASE_URL}?${qs}`, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(30_000), // 30 s — prevent indefinite hangs on slow/unresponsive upstream
  });

  if (response.status === 402) {
    const body = await response.json().catch(() => ({}));
    const err  = new Error('API quota exceeded');
    err.quotaMeta  = body.meta || { dailyQuota: 10, requestCount: 'unknown' };
    err.statusCode = 402;
    throw err;
  }

  if (!response.ok) {
    throw new Error(`Stormglass API error: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();

  // Stormglass can also signal quota exceeded inside a 200 response body
  if (body.errors?.key === 'API quota exceeded' && body.meta) {
    const err  = new Error('API quota exceeded');
    err.quotaMeta  = body.meta;
    err.statusCode = 402;
    throw err;
  }

  return { hours: body.hours, meta: body.meta };
}

// ---------------------------------------------------------------------------
// Input validation helpers
// ---------------------------------------------------------------------------

/** Parse and validate lat/lng from query string. Returns null if invalid. */
function parseCoords(query) {
  const lat = parseFloat(query.lat);
  const lng = parseFloat(query.lng);

  if (
    !Number.isFinite(lat) || !Number.isFinite(lng) ||
    lat < -90 || lat > 90 ||
    lng < -180 || lng > 180
  ) {
    return null;
  }
  return { lat, lng };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/weather/current
 * Query params: lat, lng, forceRefresh (optional, default false)
 *
 * Returns today's hourly weather data for the given coordinates.
 * Response is served from cache when available.
 */
router.get('/current', async (req, res, next) => {
  try {
    const coords = parseCoords(req.query);
    if (!coords) {
      return res.status(400).json({
        error: 'Invalid coordinates. lat must be in [-90, 90] and lng in [-180, 180].',
      });
    }

    const { lat, lng }  = coords;
    const forceRefresh  = req.query.forceRefresh === 'true';

    if (!forceRefresh) {
      const cached = getCacheEntry(lat, lng, 'current');
      if (cached) {
        console.log(`[weather] Cache HIT current (${lat}, ${lng})`);
        return res.json({ ...cached.data, _cached: true, _cachedAt: cached.timestamp });
      }
    }

    console.log(`[weather] Fetching current from Stormglass (${lat}, ${lng})`);

    const now        = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay   = startOfDay + 24 * 60 * 60 * 1000;

    const data = await fetchFromStormglass(lat, lng, startOfDay, endOfDay);
    setCacheEntry(data, lat, lng, 'current');

    res.json(data);
  } catch (err) {
    if (err.quotaMeta) {
      return res.status(402).json({ error: 'API quota exceeded', quotaMeta: err.quotaMeta });
    }
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream weather API timed out' });
    }
    next(err);
  }
});

/**
 * GET /api/weather/forecast
 * Query params: lat, lng, days (optional, accepted but ignored — see below), forceRefresh (optional, default false)
 *
 * Always fetches and caches the full 10-day payload from Stormglass, regardless of the
 * `days` query param. The `days` param is accepted for forward-compatibility but does not
 * affect what is cached or returned. This avoids a cache-poisoning bug where a
 * `forceRefresh&days=3` call would store partial data under the shared cache key,
 * causing subsequent `days=10` requests to silently receive truncated data.
 */
router.get('/forecast', async (req, res, next) => {
  try {
    const coords = parseCoords(req.query);
    if (!coords) {
      return res.status(400).json({
        error: 'Invalid coordinates. lat must be in [-90, 90] and lng in [-180, 180].',
      });
    }

    const { lat, lng } = coords;
    const forceRefresh = req.query.forceRefresh === 'true';

    if (!forceRefresh) {
      const cached = getCacheEntry(lat, lng, 'forecast');
      if (cached) {
        console.log(`[weather] Cache HIT forecast (${lat}, ${lng})`);
        return res.json({ ...cached.data, _cached: true, _cachedAt: cached.timestamp });
      }
    }

    console.log(`[weather] Fetching 10-day forecast from Stormglass (${lat}, ${lng})`);

    const now          = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endDate      = startOfToday + 10 * 24 * 60 * 60 * 1000;

    const data = await fetchFromStormglass(lat, lng, startOfToday, endDate);
    setCacheEntry(data, lat, lng, 'forecast');

    res.json(data);
  } catch (err) {
    if (err.quotaMeta) {
      return res.status(402).json({ error: 'API quota exceeded', quotaMeta: err.quotaMeta });
    }
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream weather API timed out' });
    }
    next(err);
  }
});

/**
 * GET /api/weather/cache
 * Returns current cache contents (entry count, keys, ages) for monitoring.
 */
router.get('/cache', (_req, res) => {
  const now     = Date.now();
  const entries = Array.from(weatherCache.entries()).map(([key, entry]) => ({
    key,
    type:       entry.type,
    location:   entry.location,
    cachedAt:   new Date(entry.timestamp).toISOString(),
    ageSeconds: Math.floor((now - entry.timestamp) / 1000),
  }));

  res.json({ entryCount: entries.length, entries });
});

/**
 * DELETE /api/weather/cache
 * Flush all cached weather entries. Useful after a settings change or for testing.
 */
router.delete('/cache', (_req, res) => {
  const count = weatherCache.size;
  weatherCache.clear();
  console.log(`[weather-cache] Manual flush: cleared ${count} entr${count === 1 ? 'y' : 'ies'}`);
  res.json({ message: `Cleared ${count} cache entr${count === 1 ? 'y' : 'ies'}.` });
});

module.exports = router;
