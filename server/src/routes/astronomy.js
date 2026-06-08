/**
 * Astronomy API proxy routes.
 *
 * Proxies requests to the US Naval Observatory API (USNO) to avoid CORS
 * restrictions when called from the browser.
 *
 * GET /api/astronomy/oneday?date=&coords=&tz=
 */

const express = require('express');

const router = express.Router();

const USNO_BASE_URL = 'https://aa.usno.navy.mil/api/rstt/oneday';

/**
 * Convert an IANA timezone name (e.g. "America/New_York") to the decimal UTC
 * offset required by the USNO API (e.g. -4).  Falls back to 0 (UTC) on error.
 */
function ianaToUtcOffset(tzName) {
  try {
    const now = new Date();
    // Render the same moment in UTC and in the target timezone, then diff.
    const utcMs  = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
    const localMs = new Date(now.toLocaleString('en-US', { timeZone: tzName })).getTime();
    return (localMs - utcMs) / 3_600_000; // milliseconds → decimal hours
  } catch {
    return 0;
  }
}

router.get('/oneday', async (req, res) => {
  const { date, coords, tz } = req.query;

  if (!date || !coords) {
    return res.status(400).json({ error: 'date and coords are required' });
  }

  // USNO expects a numeric UTC offset; convert IANA name if that's what arrived.
  const tzOffset = tz ? ianaToUtcOffset(tz) : 0;

  const params = new URLSearchParams({ date, coords, tz: tzOffset });

  try {
    const response = await fetch(`${USNO_BASE_URL}?${params}`);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `USNO API error: ${response.status} ${response.statusText}`
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[astronomy proxy] fetch failed:', err.message);
    res.status(502).json({ error: `Failed to reach USNO API: ${err.message}` });
  }
});

module.exports = router;
