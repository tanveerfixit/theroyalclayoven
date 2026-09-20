import express from 'express';
import pool from '../db/pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

router.get('/api/health', async (req, res) => {
  const dbHost = process.env.DB_HOST || 'NOT SET';
  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(dbHost);
  const connectionType = isLocalhost ? 'LOCAL (same server)' : `REMOTE (${dbHost})`;

  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1 AS alive');
    connection.release();

    const distExists = fs.existsSync(path.join(__dirname, '..', '..', 'dist'));

    res.json({
      status: 'CONNECTED',
      serverTime: new Date().toISOString(),
      distExists,
      message: 'Server is healthy and database is connected.'
    });
  } catch (error) {
    const distExists = fs.existsSync(path.join(__dirname, '..', '..', 'dist'));

    res.status(500).json({
      status: 'DISCONNECTED',
      serverTime: new Date().toISOString(),
      distExists,
      message: 'Database connection failed.'
    });
  }
});

export default router;
