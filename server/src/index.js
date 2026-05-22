/**
 * Activity Weather – Express backend entry point.
 *
 * Responsibilities:
 *   - Serve the Settings API  (task 2 — routes/settings.js)
 *   - Proxy weather requests  (task 3 — routes/weather.js)
 *   - Health check            (routes/health.js)
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const { getDb } = require('./database');

const healthRouter   = require('./routes/health');
const settingsRouter = require('./routes/settings');
const weatherRouter  = require('./routes/weather');

const app  = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors({
  // In production, restrict this to the frontend origin via CORS_ORIGIN env var
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Device-ID'],
}));

app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api/health',   healthRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/weather',  weatherRouter);

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function start() {
  try {
    // Ensure DB is ready before accepting requests
    await getDb();

    app.listen(PORT, () => {
      console.log(`[server] Activity Weather backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
}

start();
