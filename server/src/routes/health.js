/**
 * Health check route.
 *
 * GET /api/health
 *   Returns server status and database connectivity confirmation.
 */

const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    // Lightweight DB check
    await db.get('SELECT 1');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      message: err.message,
    });
  }
});

module.exports = router;
