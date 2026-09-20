import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';

import pool from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { generalApiLimiter } from './middleware/rateLimiters.js';

import healthRoutes from './routes/health.js';
import usersRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import bookingsRoutes from './routes/bookings.js';
import ordersRoutes from './routes/orders.js';
import settingsRoutes from './routes/settings.js';
import menuRoutes from './routes/menu.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://www.googletagmanager.com",
        "https://accounts.google.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://images.unsplash.com",
        "https://www.google-analytics.com",
        "https://www.googletagmanager.com",
        "https://lh3.googleusercontent.com"
      ],
      connectSrc: [
        "'self'",
        "https://www.google-analytics.com",
        "https://analytics.google.com",
        "https://stats.g.doubleclick.net",
        "https://www.googletagmanager.com",
        "https://accounts.google.com"
      ],
      frameSrc: [
        "'self'",
        "https://accounts.google.com"
      ],
      fontSrc: [
        "'self'",
        "data:"
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://www.clayoven.ie', 'https://clayoven.ie']
    : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', generalApiLimiter);

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host === 'clayoven.ie') {
    return res.redirect(301, `https://www.clayoven.ie${req.originalUrl}`);
  }
  next();
});

runMigrations(pool);

app.use(healthRoutes);
app.use(usersRoutes);
app.use(authRoutes);
app.use(bookingsRoutes);
app.use(ordersRoutes);
app.use(settingsRoutes);
app.use(menuRoutes);
app.use(adminRoutes);

const distPath = path.join(__dirname, '..', 'dist');
import fs from 'fs';
if (fs.existsSync(distPath)) {
  console.log('Serving Vite build assets from dist/ folder...');
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    immutable: true
  }));
  app.use(express.static(distPath, {
    maxAge: '1h',
    etag: true
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});

export default app;
