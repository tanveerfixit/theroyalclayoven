import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import bcrypt from 'bcryptjs';

dotenv.config();

// Resolve directories for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic SMTP Transporter Factory
async function getTransporter() {
  try {
    const [rows] = await pool.query('SELECT * FROM smtp_settings LIMIT 1');
    if (rows.length > 0) {
      const config = rows[0];
      return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure === 'true',
        auth: {
          user: config.user,
          pass: config.password,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }
  } catch (err) {
    console.error('Failed to retrieve SMTP settings from database, using env fallback', err);
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

async function getMailSender() {
  try {
    const [rows] = await pool.query('SELECT user FROM smtp_settings LIMIT 1');
    if (rows.length > 0) {
      return rows[0].user;
    }
  } catch (err) {
    console.error('Failed to retrieve SMTP sender from database, using env fallback', err);
  }
  return process.env.SMTP_USER || '';
}

// Security utility: sanitize user input before injection into HTML email templates
const escapeHtml = (str) => str?.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g, '&#39;') || '';

// Middleware — Security & Compression
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
        "'unsafe-inline'" // Required for Vite dynamic styling
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
  crossOriginEmbedderPolicy: false  // Allow external images (Unsplash)
}));
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://www.clayoven.ie', 'https://clayoven.ie']
    : true,  // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' }
});
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please try again after 15 minutes.' }
});
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order submissions. Please try again later.' }
});
const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', generalApiLimiter);

// Anti-caching headers for API endpoints to prevent aggressive browser/CDN caching
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Enforce WWW subdomain redirection in production for SEO and continuity
app.use((req, res, next) => {
  const host = req.headers.host || '';
  
  // Only redirect naked domain to secure WWW subdomain to prevent SSL proxy loops
  if (host === 'clayoven.ie') {
    return res.redirect(301, `https://www.clayoven.ie${req.originalUrl}`);
  }
  next();
});

// Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Verify connection on startup & perform migration
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database pool initialized successfully. Connected to Hostinger MariaDB/MySQL.');
    
    // Auto-create required tables if they don't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        picture VARCHAR(500),
        phone VARCHAR(50),
        eircode VARCHAR(50),
        address TEXT,
        dietaryPreferences VARCHAR(500),
        password VARCHAR(255)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        email VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        partySize INT NOT NULL,
        date VARCHAR(100) NOT NULL,
        time VARCHAR(100) NOT NULL,
        diningArea VARCHAR(100) NOT NULL,
        specialRequests TEXT,
        status VARCHAR(50) NOT NULL,
        createdAt VARCHAR(100) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(100) PRIMARY KEY,
        items TEXT NOT NULL,
        packagingFee DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        serviceType VARCHAR(50) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_address TEXT,
        preferredTime VARCHAR(100) NOT NULL,
        notes TEXT,
        status VARCHAR(50) NOT NULL,
        is_archived INT DEFAULT 0,
        createdAt VARCHAR(100) NOT NULL
      )
    `);

    // Auto-create SMTP settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS smtp_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        host VARCHAR(255) NOT NULL,
        port INT NOT NULL,
        secure VARCHAR(10) NOT NULL,
        user VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `);

    // Insert default settings if empty
    const [smtpRows] = await connection.query('SELECT * FROM smtp_settings LIMIT 1');
    if (smtpRows.length === 0) {
      await connection.query(`
        INSERT INTO smtp_settings (host, port, secure, user, password)
        VALUES (?, ?, ?, ?, ?)
      `, [
        process.env.SMTP_HOST || 'smtp.gmail.com',
        parseInt(process.env.SMTP_PORT || '465'),
        process.env.SMTP_SECURE || 'true',
        process.env.SMTP_USER || '',
        process.env.SMTP_PASS || ''
      ]);
      console.log('Default SMTP configurations initialized inside database settings successfully.');
    } else if (
      (process.env.SMTP_USER && smtpRows[0].user !== process.env.SMTP_USER) ||
      (process.env.SMTP_PASS && smtpRows[0].password !== process.env.SMTP_PASS) ||
      (process.env.SMTP_HOST && smtpRows[0].host !== process.env.SMTP_HOST)
    ) {
      await connection.query(`
        UPDATE smtp_settings 
        SET host = ?, port = ?, secure = ?, user = ?, password = ?
        WHERE id = ?
      `, [
        process.env.SMTP_HOST || 'smtp.gmail.com',
        parseInt(process.env.SMTP_PORT || '465'),
        process.env.SMTP_SECURE || 'true',
        process.env.SMTP_USER,
        process.env.SMTP_PASS || '',
        smtpRows[0].id
      ]);
      console.log('Synchronized database SMTP settings with updated .env configurations.');
    }

    // Auto-create store settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        setting_value LONGTEXT NOT NULL
      )
    `);

    // Auto-create business info table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS business_info (
        id INT PRIMARY KEY AUTO_INCREMENT,
        business_name VARCHAR(255) NOT NULL,
        address VARCHAR(500) NOT NULL,
        maps_url VARCHAR(500) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        whatsapp VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL
      )
    `);

    // Seed default business info if table is empty
    const [bizRows] = await connection.query('SELECT * FROM business_info LIMIT 1');
    if (bizRows.length === 0) {
      await connection.query(`
        INSERT INTO business_info (business_name, address, maps_url, phone, mobile, whatsapp, email)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'THE ROYAL CLAY OVEN',
        'Ballycasey Craft And Design Center, Shannon, County Clare V14 AW71',
        'https://maps.google.com/?q=The+Royal+Clay+Oven+Ballycasey+Craft+And+Design+Center+Shannon+County+Clare+V14+AW71',
        '061 703 513',
        '086 020 3720',
        '086 020 3720',
        'sales@clayoven.ie'
      ]);
      console.log('Default business info initialized inside database successfully.');
    } else {
      // If table is not empty but contains old default numbers, update them automatically
      const current = bizRows[0];
      if (current.phone === '086 020 3720' && current.mobile === '089 489 9950') {
        await connection.query(`
          UPDATE business_info 
          SET phone = ?, mobile = ?, whatsapp = ?
          WHERE id = ?
        `, ['061 703 513', '086 020 3720', '086 020 3720', current.id]);
        console.log('Updated existing business info records with new default phone, mobile, and whatsapp in database.');
      }
    }

    // Upgrade column to LONGTEXT dynamically to support base64 images
    try {
      await connection.query('ALTER TABLE store_settings MODIFY COLUMN setting_value LONGTEXT NOT NULL');
      console.log('Verified store_settings schema modified to LONGTEXT successfully.');
    } catch (alterErr) {
      console.warn('Altering store_settings column failed (might be already LONGTEXT):', alterErr.message);
    }

    // Default settings to seed
    const defaultSettings = {
      'clay_oven_timing_monday': '4:00 PM - 9:00 PM',
      'clay_oven_timing_tuesday': '4:00 PM - 9:00 PM',
      'clay_oven_timing_wednesday': '4:00 PM - 9:00 PM',
      'clay_oven_timing_thursday': '4:00 PM - 9:00 PM',
      'clay_oven_timing_friday': '4:00 PM - 9:00 PM',
      'clay_oven_timing_saturday': '12:00 PM - 9:00 PM',
      'clay_oven_timing_sunday': '10:00 AM - 6:00 PM',
      'clay_oven_timing_offset': 'KITCHEN CLOSES 15 MINS PRIOR',
      'clay_oven_notice_text': 'We are Still Working on Website, for online order please contact.',
      'clay_oven_notice_phone': '089 489 9950',
      'clay_oven_notice_enabled': 'true',
      'clay_oven_booking_notice_text': `Assalamu Alaikum, dear friends and valued guests,

We are incredibly grateful for the wonderful love and support you show us every single day!

While we would love nothing more than to celebrate Eid with all of you, we want to share that our restaurant is now completely fully booked for Eid this Wednesday.

To ensure that everyone dining with us has a fantastic experience, we are unfortunately unable to accept any further bookings or walk-ins for that day.

While we truly wish we could host every one of you on Wednesday, we would be absolutely delighted to welcome you, your family, and your friends on Thursday instead! Please do book a table with us so we can celebrate together then.

To bring a little extra joy to your week, we have some exciting news!

Due to popular demand, we are extending our special Pakistani breakfast service. You can now come and enjoy it with us on both Saturday and Sunday, rather than just on Sundays!

Thank you from the bottom of our hearts for your understanding and continuous support. We cannot wait to see your smiling faces soon!

Warmest regards,

The Royal Clay Oven`,
      'clay_oven_booking_notice_enabled': 'true',
      'clay_oven_takeaway_enabled': 'true',
      'clay_oven_takeaway_notice': 'We are temporarily not taking online orders. Please phone us to order directly!',
      'clay_oven_reservations_enabled': 'true',
      'clay_oven_reservations_notice': 'Table reservations are temporarily closed. Please telephone us to book a table!',
      'clay_oven_festive_enabled': 'true',
      'clay_oven_festive_header': "FATHER'S DAY DINNER",
      'clay_oven_festive_subheader': 'Sunday, 21st June',
      'clay_oven_festive_description': `Hello to all our Royal customers!

We are excited to announce our exclusive 4-Course Father’s Day Dinner Menu.

From our signature Peri-Peri Chicken Strips and mouth-watering Smash Burgers to premium upgrades like Prime Sirloin Steak and a perfectly Pan-Seared Sea Bass, we have something spectacular for every dad.

Top it all off with our delicious Milk Cake and freshly brewed tea or coffee.

Booking is highly recommended. Spaces are filling up fast, so make sure you secure your table early to avoid disappointment.

Please note a 10% service charge applies. Location: The Royal Clay Oven, V14 AW71. Call us now at 061 703 513 to book!`,
      'clay_oven_festive_price': '39.95',
      'clay_oven_festive_items': `Starters | Peri-Peri Chicken Strips & Springrolls (Veg or Chicken)
Mains | Grilled Peppercorn Chicken, Smash Burger, Sirloin Steak (+€5 supplement) & Pan-seared Fish (+€5 supplement)
Dessert | Milk Cake
Beverages | Tea or Coffee`,
      'clay_oven_image_hero_bg': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=80',
      'clay_oven_image_heritage_left': 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=600&q=80',
      'clay_oven_image_heritage_right': 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=600&q=80',
      'clay_oven_takeaway_charges': '0.95',
      'clay_oven_delivery_charges': '3.00'
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      await connection.query(`
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = setting_value
      `, [key, value]);
    }
    console.log('Global storefront settings verified and seeded in database successfully.');

    // Auto-create admin authentication tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_emails (
        email VARCHAR(255) PRIMARY KEY
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_otps (
        email VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL
      )
    `);

    // Seed authorized admin emails (insert only if not already present)
    const adminEmails = ['tanveerfixit@gmail.com', 'accounts@clayoven.ie'];
    for (const adminEmail of adminEmails) {
      await connection.query(
        'INSERT IGNORE INTO admin_emails (email) VALUES (?)',
        [adminEmail]
      );
    }
    console.log('Admin authentication tables and authorized emails verified successfully.');

    // Auto-create order notification emails table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_notification_emails (
        email VARCHAR(255) PRIMARY KEY
      )
    `);

    // Seed default notification email
    await connection.query(
      'INSERT IGNORE INTO order_notification_emails (email) VALUES (?)',
      ['sales@clayoven.ie']
    );
    await connection.query(
      'INSERT IGNORE INTO order_notification_emails (email) VALUES (?)',
      ['tanveerfixit@gmail.com']
    );
    await connection.query(
      'DELETE FROM order_notification_emails WHERE email = ?',
      ['customers@clayoven.ie']
    );
    console.log('Order notification email settings verified and seeded successfully.');

    // Ensure local uploads folder exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Static self-hosted uploads directory verified and created successfully.');
    }

    console.log('Database tables verified and auto-created successfully.');
    connection.release();
  } catch (error) {
    console.error('Database connection or initialization failed:', error);
    // Don't crash the server on startup so that /api/health can run and report the exact connection error to the developer/user!
  }
})();

/* --- API ENDPOINTS --- */

// 0. Health Check & Database Diagnostic Endpoint
app.get('/api/health', async (req, res) => {
  const dbHost = process.env.DB_HOST || 'NOT SET';
  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(dbHost);
  const connectionType = isLocalhost ? 'LOCAL (same server)' : `REMOTE (${dbHost})`;

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 AS alive');
    connection.release();

    const distExists = fs.existsSync(path.join(__dirname, 'dist'));
    const filesInDir = fs.readdirSync(__dirname).filter(f => !f.startsWith('.'));

    res.json({
      status: 'CONNECTED',
      serverTime: new Date().toISOString(),
      distExists,
      message: 'Server is healthy and database is connected.'
    });
  } catch (error) {
    const distExists = fs.existsSync(path.join(__dirname, 'dist'));

    res.status(500).json({
      status: 'DISCONNECTED',
      serverTime: new Date().toISOString(),
      distExists,
      message: 'Database connection failed.'
    });
  }
});

// 1. User Profiles API
app.get('/api/users/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    // Format response back into type UserProfile
    const user = rows[0];
    res.json({
      name: user.name,
      email: user.email,
      picture: user.picture,
      phone: user.phone || undefined,
      eircode: user.eircode || undefined,
      address: user.address || undefined,
      dietaryPreferences: user.dietaryPreferences || undefined
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/api/users', async (req, res) => {
  const { email, name, picture, phone, eircode, address, dietaryPreferences } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }

  try {
    // Upsert query: insert new profile or update existing
    await pool.query(
      `INSERT INTO users (email, name, picture, phone, eircode, address, dietaryPreferences)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         name = VALUES(name),
         picture = VALUES(picture),
         phone = COALESCE(VALUES(phone), phone),
         eircode = COALESCE(VALUES(eircode), eircode),
         address = COALESCE(VALUES(address), address),
         dietaryPreferences = COALESCE(VALUES(dietaryPreferences), dietaryPreferences)`,
      [
        email, 
        name, 
        picture || null, 
        phone || null, 
        eircode || null, 
        address || null, 
        dietaryPreferences || null
      ]
    );

    // Fetch the updated profile to return
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      const userObj = rows[0];
      delete userObj.password;

      // Auto-authorize admin rights if email is in admin_emails
      const [adminRows] = await pool.query('SELECT * FROM admin_emails WHERE email = ?', [email.toLowerCase().trim()]);
      if (adminRows.length > 0) {
        const adminToken = jwt.sign(
          { email: email.toLowerCase().trim(), role: 'admin' },
          ADMIN_JWT_SECRET,
          { expiresIn: '24h' }
        );
        userObj.adminToken = adminToken;
        console.log(`Auto-authorized admin session via Google sign-in for: ${email}`);
      }

      res.json(userObj);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database update failed' });
  }
});

// 1.5. Authentication and OTP APIs
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
      [email, name, hashedPassword]
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      delete rows[0].password;
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Database signup error' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    // Check if this is a Google-only account
    if (!user.password) {
      return res.status(400).json({ error: 'This account was authenticated via Google. Please log in with Google.' });
    }

    // Compare password with bcrypt hash (also supports legacy plaintext for migration)
    let isValidPassword = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      // Legacy plaintext comparison — auto-upgrade to hashed
      isValidPassword = (user.password === password);
      if (isValidPassword) {
        const hashedPassword = await bcrypt.hash(password, 12);
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
      }
    }

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid email or password credentials' });
    }

    if (rows.length > 0) {
      delete rows[0].password;
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Database login query error' });
  }
});

app.post('/api/auth/forgot-password', otpLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'No account registered with this email address' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query(
      `INSERT INTO password_reset_otps (email, otp, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
      [email, otp, expiresAt]
    );

    const mailSender = await getMailSender();
    const mailOptions = {
      from: `"The Royal Clay Oven" <${mailSender}>`,
      to: email,
      subject: 'Your Password Reset OTP Passcode',
      html: `
        <div style="font-family: sans-serif; padding: 24px; max-width: 600px; margin: auto; border: 1px solid #eee; text-align: center;">
          <h2 style="color: #C85A32; font-family: serif;">THE ROYAL CLAY OVEN</h2>
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #777;">Password Reset Verification Code</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 14px; line-height: 1.5; color: #333; text-align: left;">Hello,</p>
          <p style="font-size: 14px; line-height: 1.5; color: #333; text-align: left;">We received a request to reset the password for your Royal Clay Oven account. Please use the following One-Time Passcode (OTP) to complete your verification:</p>
          <div style="background-color: #FDFBF7; border: 1px dashed #C85A32; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 0.25em; color: #2C2621; margin: 24px 0; display: inline-block;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #888; text-align: left;">★ **Important Details:**</p>
          <ul style="font-size: 12px; color: #555; text-align: left; padding-left: 20px; line-height: 1.6;">
            <li>This OTP passcode is valid for exactly <strong>15 minutes</strong> from the time of generation.</li>
            <li>If you did not request a password reset, you can safely ignore this email.</li>
          </ul>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #999;">The Royal Clay Oven &bull; Ballycasey, Shannon, Co. Clare &bull; accounts@clayoven.ie</p>
        </div>
      `
    };

    const activeTransporter = await getTransporter();
    await activeTransporter.sendMail(mailOptions);
    console.log(`Successfully dispatched password reset OTP to: ${email}`);
    res.json({ success: true, message: 'OTP verification code has been dispatched to your email.' });
  } catch (error) {
    console.error('Forgot password endpoint error:', error);
    res.status(500).json({ error: 'Failed to generate or send OTP passcode. Please check email details.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM password_reset_otps WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No active OTP verification code found for this email' });
    }

    const record = rows[0];
    const expiresAt = new Date(record.expires_at);

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Incorrect OTP passcode entered. Please verify code.' });
    }

    if (expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'OTP passcode has expired (valid for 15 minutes). Please resend code.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedNewPassword, email]
    );

    await pool.query(
      'DELETE FROM password_reset_otps WHERE email = ?',
      [email]
    );

    res.json({ success: true, message: 'Password has been updated successfully! Please log in.' });
  } catch (error) {
    console.error('Reset password endpoint error:', error);
    res.status(500).json({ error: 'Failed to update credentials. Database query error.' });
  }
});

// 2. Bookings (Reservations) API
app.get('/api/bookings', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email query parameter is required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM bookings WHERE email = ? ORDER BY createdAt DESC', 
      [email]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/api/bookings', orderLimiter, async (req, res) => {
  const { id, name, email, phone, partySize, date, time, diningArea, specialRequests, status, createdAt } = req.body;
  if (!id || !name || !email || !phone || !partySize || !date || !time || !diningArea || !status || !createdAt) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  try {
    await pool.query(
      `INSERT INTO bookings (id, name, email, phone, partySize, date, time, diningArea, specialRequests, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email, phone, partySize, date, time, diningArea, specialRequests || null, status, createdAt]
    );

    // Send instant acknowledgement email to the customer
    const mailSender = await getMailSender();
    const mailOptions = {
      from: `"The Royal Clay Oven" <${mailSender}>`,
      to: email,
      subject: `Reservation Request Received - ${id}`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; max-width: 600px; margin: auto; border: 1px solid #eee; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #C85A32; font-family: serif; margin: 0; letter-spacing: 0.1em; font-size: 28px;">THE ROYAL CLAY OVEN</h2>
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #777; margin: 5px 0 0 0;">Reservation Request Received</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 14px; line-height: 1.5; color: #333;">Dear ${escapeHtml(name)},</p>
          <p style="font-size: 14px; line-height: 1.5; color: #333;">Assalamu Alaikum! Thank you for submitting a table reservation request at <strong>The Royal Clay Oven</strong>.</p>
          <p style="font-size: 14px; line-height: 1.5; color: #333;">We have received your reservation request and our restaurant team is currently reviewing table availability. <strong>We will let you know and send you a final confirmation email shortly once your table is secured.</strong></p>
          
          <div style="background-color: #FDFBF7; border: 1px dashed #C85A32; padding: 20px; margin: 24px 0;">
            <h3 style="color: #2C2621; font-family: serif; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px; font-size: 16px;">Requested Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-family: monospace; font-size: 13px; color: #555;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 40%;">Request Reference:</td>
                <td style="padding: 6px 0; color: #2C2621; font-weight: bold;">${id}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Date Requested:</td>
                <td style="padding: 6px 0; color: #2C2621; font-weight: bold;">${date}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Requested Time:</td>
                <td style="padding: 6px 0; color: #2C2621; font-weight: bold;">${time}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Guests Attending:</td>
                <td style="padding: 6px 0; color: #2C2621; font-weight: bold;">${partySize} Pax</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Dining Zone:</td>
                <td style="padding: 6px 0; color: #2C2621; font-weight: bold;">${diningArea}</td>
              </tr>
              ${specialRequests ? `
              <tr>
                <td style="padding: 6px 0; font-weight: bold; vertical-align: top;">Requests / Package:</td>
                <td style="padding: 6px 0; color: #777; font-family: sans-serif; font-style: italic;">${escapeHtml(specialRequests)}</td>
              </tr>` : ''}
            </table>
          </div>

          <p style="font-size: 13px; line-height: 1.5; color: #777; background-color: #f9f9f9; padding: 12px; border-left: 3px solid #777;">
            Please note: This is an acknowledgement email to verify that we have received your booking details. We will confirm your booking shortly.
          </p>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">The Royal Clay Oven &bull; Ballycasey Craft And Design Center, Shannon, Co. Clare &bull; accounts@clayoven.ie</p>
        </div>
      `
    };

    const activeTransporter = await getTransporter();
    await activeTransporter.sendMail(mailOptions);
    console.log(`Dispatched initial booking request receipt email to customer ${email} for reference ${id}`);

    res.status(201).json({ success: true, bookingId: id });
  } catch (error) {
    console.error('Error inserting booking or sending acknowledgement email:', error);
    // Return success since the database transaction was successful anyway
    res.status(201).json({ success: true, bookingId: id });
  }
});

app.put('/api/bookings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, sendEmail } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // If requested, send booking confirmation email
    if (status === 'Confirmed' && sendEmail) {
      const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [id]);
      if (rows.length > 0) {
        const booking = rows[0];
        
        const mailSender = await getMailSender();
        const mailOptions = {
          from: `"The Royal Clay Oven" <${mailSender}>`,
          to: booking.email,
          subject: `Table Reservation Confirmed - ${booking.id}`,
          html: `
            <div style="font-family: sans-serif; padding: 24px; max-width: 600px; margin: auto; border: 1px solid #eee; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #C85A32; font-family: serif; margin: 0; letter-spacing: 0.1em; font-size: 28px;">THE ROYAL CLAY OVEN</h2>
                <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #777; margin: 5px 0 0 0;">Table Reservation Confirmed</p>
              </div>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 14px; line-height: 1.5; color: #333;">Dear ${booking.name},</p>
              <p style="font-size: 14px; line-height: 1.5; color: #333;">We are absolutely delighted to confirm your upcoming reservation at <strong>The Royal Clay Oven</strong>! We are hard at work preparing for your visit and cannot wait to host you.</p>
              
              <div style="background-color: #FDFBF7; border: 1px solid #C85A32; padding: 20px; margin: 24px 0;">
                <h3 style="color: #2C2621; font-family: serif; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px; font-size: 16px;">Reservation Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-family: monospace; font-size: 13px; color: #555;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; width: 40%;">Reservation Reference:</td>
                    <td style="padding: 6px 0; color: #2C2621; font-weight: bold;">${booking.id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold;">Date Scheduled:</td>
                    <td style="padding: 6px 0; color: #2C2621; font-weight: bold;">${booking.date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold;">Fulfillment Time:</td>
                    <td style="padding: 6px 0; color: #2C2621; font-weight: bold;">${booking.time}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold;">Guests Attending:</td>
                    <td style="padding: 6px 0; color: #2C2621; font-weight: bold;">${booking.partySize} Pax</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold;">Dining Zone:</td>
                    <td style="padding: 6px 0; color: #2C2621; font-weight: bold;">${booking.diningArea}</td>
                  </tr>
                  ${booking.specialRequests ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; vertical-align: top;">Requests / Package:</td>
                    <td style="padding: 6px 0; color: #777; font-family: sans-serif; font-style: italic;">${booking.specialRequests}</td>
                  </tr>` : ''}
                </table>
              </div>

              <p style="font-size: 13px; line-height: 1.6; color: #555; background-color: #fcfcfc; padding: 12px; border-left: 3px solid #C85A32; margin: 15px 0;">
                <strong>★ Seating Notice:</strong> Seating allocation is subject to exact arrival timings. Tables are held for a maximum of 15 minutes past your scheduled reservation hour.
              </p>

              <p style="font-size: 14px; line-height: 1.5; color: #333;">If you need to adjust your reservation details, feel free to contact us directly by replying to this email or calling our team at <a href="tel:061703636" style="color: #C85A32; font-weight: bold; text-decoration: none;">061 703 636</a> / <a href="tel:0894899950" style="color: #C85A32; font-weight: bold; text-decoration: none;">089 489 9950</a>.</p>
              
              <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">The Royal Clay Oven &bull; Ballycasey Craft And Design Center, Shannon, Co. Clare &bull; accounts@clayoven.ie</p>
            </div>
          `
        };
        const activeTransporter = await getTransporter();
        await activeTransporter.sendMail(mailOptions);
        console.log(`Successfully dispatched booking confirmation email to: ${booking.email}`);
      }
    }
    
    res.json({ success: true, message: `Booking status updated to ${status}` });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// 3. Orders API
app.get('/api/orders', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email query parameter is required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM orders WHERE customer_email = ? ORDER BY createdAt DESC',
      [email]
    );
    
    // Parse the items string JSON for each order
    const formattedOrders = rows.map((order) => {
      let items = [];
      try {
        items = JSON.parse(order.items);
      } catch (e) {
        console.error('Failed to parse items JSON for order:', order.id);
      }
      
      return {
        id: order.id,
        items,
        packagingFee: parseFloat(order.packagingFee),
        subtotal: parseFloat(order.subtotal),
        total: parseFloat(order.total),
        serviceType: order.serviceType,
        customerInfo: {
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
          address: order.customer_address || undefined,
          preferredTime: order.preferredTime,
          notes: order.notes || undefined
        },
        status: order.status,
        isArchived: order.is_archived === 1,
        createdAt: order.createdAt
      };
    });
    
    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/api/orders', orderLimiter, async (req, res) => {
  const { id, items, packagingFee, subtotal, total, serviceType, customerInfo, status, createdAt } = req.body;
  if (!id || !items || packagingFee === undefined || !subtotal || !total || !serviceType || !customerInfo || !status || !createdAt) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }

  try {
    const serializedItems = JSON.stringify(items);
    await pool.query(
      `INSERT INTO orders (id, items, packagingFee, subtotal, total, serviceType, customer_name, customer_email, customer_phone, customer_address, preferredTime, notes, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        serializedItems,
        packagingFee,
        subtotal,
        total,
        serviceType,
        customerInfo.name,
        customerInfo.email,
        customerInfo.phone,
        customerInfo.address || null,
        customerInfo.preferredTime,
        customerInfo.notes || null,
        status,
        createdAt
      ]
    );
    // Fetch active notification recipient email list
    const [emailRows] = await pool.query('SELECT email FROM order_notification_emails');
    const recipientEmails = emailRows.map(r => r.email);

    if (recipientEmails.length > 0) {
      const activeTransporter = await getTransporter();
      
      // Build items HTML table
      let itemsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-family: monospace; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 2px solid #2C2621; text-align: left; font-weight: bold; background: #eee;">
              <th style="padding: 8px;">Item</th>
              <th style="padding: 8px;">Size</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
      `;
      for (const item of items) {
        const itemPrice = item.price || item.menuItem?.price || 0;
        itemsHtml += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">
              <strong>${escapeHtml(item.name || item.menuItem?.name || '')}</strong>
              ${item.notes ? `<br/><span style="font-size: 11px; color: #C85A32; font-style: italic;">"${escapeHtml(item.notes)}"</span>` : ''}
            </td>
            <td style="padding: 8px;">${escapeHtml(item.size || '')}</td>
            <td style="padding: 8px; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; text-align: right;">&euro;${(itemPrice * item.quantity).toFixed(2)}</td>
          </tr>
        `;
      }
      itemsHtml += `
          </tbody>
        </table>
      `;

      const mailSender = await getMailSender();
      const mailOptions = {
        from: `"The Royal Clay Oven Alert" <${mailSender}>`,
        to: recipientEmails.join(', '),
        subject: `NEW ORDER RECEIVED: ${id} [${serviceType.toUpperCase()}]`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; max-width: 600px; margin: auto; border: 1px solid #eee;">
            <div style="text-align: center;">
              <h2 style="color: #C85A32; font-family: serif; letter-spacing: 0.1em; margin-bottom: 4px;">THE ROYAL CLAY OVEN</h2>
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #777; font-weight: bold;">New Incoming Order Alert</span>
            </div>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            
            <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 4px 0; color: #666; width: 120px;">Order ID:</td>
                <td style="padding: 4px 0; font-weight: bold; color: #2C2621;">${escapeHtml(id)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #666;">Fulfillment:</td>
                <td style="padding: 4px 0; font-weight: bold; text-transform: uppercase; color: #C85A32;">${escapeHtml(serviceType)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #666;">Time:</td>
                <td style="padding: 4px 0; font-weight: bold;">${escapeHtml(customerInfo.preferredTime || 'ASAP')}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #666;">Ordered At:</td>
                <td style="padding: 4px 0;">${escapeHtml(new Date(createdAt).toLocaleString('en-IE'))}</td>
              </tr>
            </table>

            <h3 style="color: #2C2621; border-bottom: 1px solid #eee; padding-bottom: 6px; font-size: 15px; margin-bottom: 10px;">Customer Details</h3>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 4px 0; color: #666; width: 120px;">Name:</td>
                <td style="padding: 4px 0; font-weight: bold;">${escapeHtml(customerInfo.name)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #666;">Phone:</td>
                <td style="padding: 4px 0; font-weight: bold;"><a href="tel:${escapeHtml(customerInfo.phone.replace(/\s+/g, ''))}">${escapeHtml(customerInfo.phone)}</a></td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #666;">Email:</td>
                <td style="padding: 4px 0;">${escapeHtml(customerInfo.email)}</td>
              </tr>
              ${customerInfo.address ? `
              <tr>
                <td style="padding: 4px 0; color: #666; vertical-align: top;">Address:</td>
                <td style="padding: 4px 0; font-weight: bold; line-height: 1.4;">${escapeHtml(customerInfo.address)}</td>
              </tr>
              ` : ''}
              ${customerInfo.notes ? `
              <tr>
                <td style="padding: 4px 0; color: #C85A32; vertical-align: top;">Chef Notes:</td>
                <td style="padding: 4px 0; font-style: italic; color: #C85A32; font-weight: bold;">"${escapeHtml(customerInfo.notes)}"</td>
              </tr>
              ` : ''}
            </table>

            <h3 style="color: #2C2621; border-bottom: 1px solid #eee; padding-bottom: 6px; font-size: 15px; margin-bottom: 10px;">Order Summary</h3>
            ${itemsHtml}

            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-family: monospace; font-size: 13px; border-top: 2px solid #2C2621; pt-10px;">
              <tr>
                <td style="padding: 6px 8px; text-align: right; color: #666;">Subtotal:</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: bold; width: 100px;">&euro;${parseFloat(subtotal).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 8px; text-align: right; color: #666;">Packaging:</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: bold;">&euro;${parseFloat(packagingFee).toFixed(2)}</td>
              </tr>
              ${parseFloat(total) - parseFloat(subtotal) - parseFloat(packagingFee) > 0.1 ? `
              <tr>
                <td style="padding: 6px 8px; text-align: right; color: #666;">Delivery Charge:</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: bold;">&euro;${(parseFloat(total) - parseFloat(subtotal) - parseFloat(packagingFee)).toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr style="font-size: 15px; background: #FDFBF7; border-top: 1px dashed #2C2621;">
                <td style="padding: 8px; text-align: right; font-weight: bold; color: #C85A32;">GRAND TOTAL:</td>
                <td style="padding: 8px; text-align: right; font-weight: bold; color: #C85A32; font-size: 16px;">&euro;${parseFloat(total).toFixed(2)}</td>
              </tr>
            </table>

            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0 20px 0;" />
            <div style="text-align: center;">
              <a href="https://www.clayoven.ie/admin" style="background-color: #2C2621; color: white; padding: 10px 20px; text-decoration: none; font-size: 12px; font-family: monospace; font-weight: bold; letter-spacing: 0.1em; display: inline-block;">OPEN KITCHEN CONSOLE</a>
            </div>
          </div>
        `
      };

      try {
        await activeTransporter.sendMail(mailOptions);
        console.log(`Notification emails successfully sent for order ${id} to: ${recipientEmails.join(', ')}`);
      } catch (mailErr) {
        console.error('Failed to send order notification emails:', mailErr);
      }
    }

    res.status(201).json({ success: true, orderId: id });
  } catch (error) {
    console.error('Error inserting order:', error);
    res.status(500).json({ error: 'Database save failed' });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('UPDATE orders SET is_archived = 1 WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, message: 'Order receipt log soft deleted' });
  } catch (error) {
    console.error('Error archiving order:', error);
    res.status(500).json({ error: 'Database archiving failed' });
  }
});

// --- Admin Authentication Middleware ---
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || crypto.randomBytes(32).toString('hex');

const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — admin authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    req.adminEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized — session expired or invalid token' });
  }
};

// --- Admin Authentication Endpoints ---

// Request OTP — sends a 6-digit code to an authorized admin email
app.post('/api/admin/request-otp', otpLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  try {
    // Check if this email is an authorized admin
    const [adminRows] = await pool.query('SELECT * FROM admin_emails WHERE email = ?', [email.toLowerCase().trim()]);
    if (adminRows.length === 0) {
      return res.status(403).json({ error: 'This email address is not authorized for admin access' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store OTP in database (upsert)
    await pool.query(
      `INSERT INTO admin_otps (email, otp, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
      [email.toLowerCase().trim(), otp, expiresAt]
    );

    // Send OTP via email
    const mailSender = await getMailSender();
    const mailOptions = {
      from: `"The Royal Clay Oven" <${mailSender}>`,
      to: email,
      subject: 'Admin Console Access Code — The Royal Clay Oven',
      html: `
        <div style="font-family: sans-serif; padding: 24px; max-width: 600px; margin: auto; border: 1px solid #eee; text-align: center;">
          <h2 style="color: #C85A32; font-family: serif; letter-spacing: 0.1em;">THE ROYAL CLAY OVEN</h2>
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #777;">Admin Console Access Code</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 14px; line-height: 1.5; color: #333; text-align: left;">Hello,</p>
          <p style="font-size: 14px; line-height: 1.5; color: #333; text-align: left;">A login request was made for the Admin Console. Use the following One-Time Access Code to authenticate:</p>
          <div style="background-color: #FDFBF7; border: 1px dashed #C85A32; padding: 15px; font-size: 28px; font-weight: bold; letter-spacing: 0.3em; color: #2C2621; margin: 24px 0; display: inline-block;">
            ${otp}
          </div>
          <ul style="font-size: 12px; color: #555; text-align: left; padding-left: 20px; line-height: 1.6;">
            <li>This code is valid for <strong>1 hour</strong> from the time of generation.</li>
            <li>If you did not request this code, you can safely ignore this email.</li>
            <li>Do not share this code with anyone.</li>
          </ul>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #999;">The Royal Clay Oven &bull; Ballycasey, Shannon, Co. Clare &bull; accounts@clayoven.ie</p>
        </div>
      `
    };

    const activeTransporter = await getTransporter();
    await activeTransporter.sendMail(mailOptions);
    console.log(`Admin OTP dispatched to: ${email}`);
    res.json({ success: true, message: 'Access code has been sent to your email address.' });
  } catch (error) {
    console.error('Admin OTP request error:', error);
    res.status(500).json({ error: 'Failed to generate or send access code. Please try again.' });
  }
});

// Verify OTP — validates the code and returns a signed JWT session token
app.post('/api/admin/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and access code are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM admin_otps WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No active access code found for this email. Please request a new one.' });
    }

    const record = rows[0];
    const expiresAt = new Date(record.expires_at);

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Incorrect access code. Please check your email and try again.' });
    }

    if (expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Access code has expired. Please request a new one.' });
    }

    // OTP is valid — delete it so it can't be reused
    await pool.query('DELETE FROM admin_otps WHERE email = ?', [email.toLowerCase().trim()]);

    // Issue JWT token (valid for 24 hours)
    const token = jwt.sign(
      { email: email.toLowerCase().trim(), role: 'admin' },
      ADMIN_JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`Admin session authenticated for: ${email}`);
    res.json({ success: true, token, message: 'Authentication successful.' });
  } catch (error) {
    console.error('Admin OTP verification error:', error);
    res.status(500).json({ error: 'Failed to verify access code. Please try again.' });
  }
});

// Verify existing token — used by frontend to auto-login on page refresh
app.get('/api/admin/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], ADMIN_JWT_SECRET);
    res.json({ valid: true, email: decoded.email });
  } catch (err) {
    res.status(401).json({ valid: false });
  }
});

// 4. Admin API Endpoints (Protected)
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM orders ORDER BY createdAt DESC LIMIT 150'
    );
    
    const formattedOrders = rows.map((order) => {
      let items = [];
      try {
        items = JSON.parse(order.items);
      } catch (e) {
        console.error('Failed to parse items JSON for admin order:', order.id);
      }
      
      return {
        id: order.id,
        items,
        packagingFee: parseFloat(order.packagingFee),
        subtotal: parseFloat(order.subtotal),
        total: parseFloat(order.total),
        serviceType: order.serviceType,
        customerInfo: {
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
          address: order.customer_address || undefined,
          preferredTime: order.preferredTime,
          notes: order.notes || undefined
        },
        status: order.status,
        isArchived: order.is_archived === 1,
        createdAt: order.createdAt
      };
    });
    
    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.put('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (error) {
    console.error('Error updating admin order status:', error);
    res.status(500).json({ error: 'Database update failed' });
  }
});

app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM bookings ORDER BY date DESC, time DESC LIMIT 200'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// In-memory cache for non-image settings to reduce DB hits
let settingsCache = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 60 * 1000; // 60 seconds

// 5. Store Settings API Endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const now = Date.now();
    if (settingsCache && (now - settingsCacheTime) < SETTINGS_CACHE_TTL) {
      return res.json(settingsCache);
    }
    const [rows] = await pool.query('SELECT * FROM store_settings');
    const settingsObj = {};
    rows.forEach(row => {
      // Exclude base64 image data from the settings response for performance
      if (!row.setting_key.startsWith('clay_oven_image_') && !row.setting_key.startsWith('clay_oven_dish_image_')) {
        settingsObj[row.setting_key] = row.setting_value;
      }
    });
    settingsCache = settingsObj;
    settingsCacheTime = now;
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching store settings:', error);
    res.status(500).json({ error: 'Failed to retrieve storefront settings' });
  }
});

// Lightweight endpoint to fetch a single image setting by key
app.get('/api/settings/images/:key', async (req, res) => {
  const { key } = req.params;
  // Only allow fetching image keys for security
  if (!key.startsWith('clay_oven_image_') && !key.startsWith('clay_oven_dish_image_')) {
    return res.status(400).json({ error: 'Only image setting keys are allowed' });
  }
  try {
    const [rows] = await pool.query('SELECT setting_value FROM store_settings WHERE setting_key = ? LIMIT 1', [key]);
    if (rows.length > 0 && rows[0].setting_value) {
      res.json({ key, value: rows[0].setting_value });
    } else {
      res.status(404).json({ error: 'Image setting not found' });
    }
  } catch (error) {
    console.error('Error fetching image setting:', error);
    res.status(500).json({ error: 'Failed to retrieve image setting' });
  }
});

app.post('/api/settings', requireAdmin, async (req, res) => {
  const settings = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Payload must be a key-value settings object' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const [key, value] of Object.entries(settings)) {
      await connection.query(
        `INSERT INTO store_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, String(value)]
      );
    }
    await connection.commit();
    settingsCache = null;
    res.json({ success: true, message: 'Settings successfully synchronized with server database' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating store settings in database:', error);
    res.status(500).json({ error: 'Failed to update storefront settings in database' });
  } finally {
    connection.release();
  }
});

// 5.6. Admin SMTP Settings API Endpoints
app.get('/api/admin/smtp', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT host, port, secure, user FROM smtp_settings LIMIT 1');
    if (rows.length > 0) {
      res.json({
        host: rows[0].host,
        port: rows[0].port,
        secure: rows[0].secure === 'true',
        user: rows[0].user,
        hasPassword: true
      });
    } else {
      res.json({
        host: '',
        port: 465,
        secure: true,
        user: '',
        hasPassword: false
      });
    }
  } catch (error) {
    console.error('Error fetching SMTP settings:', error);
    res.status(500).json({ error: 'Failed to retrieve SMTP settings' });
  }
});

app.post('/api/admin/smtp', requireAdmin, async (req, res) => {
  const { host, port, secure, user, password } = req.body;
  if (!host || !port || !user) {
    return res.status(400).json({ error: 'host, port, and user are required fields' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM smtp_settings LIMIT 1');
    if (rows.length > 0) {
      const config = rows[0];
      const finalPassword = (!password || password === '********') ? config.password : password;
      await pool.query(
        `UPDATE smtp_settings 
         SET host = ?, port = ?, secure = ?, user = ?, password = ?
         WHERE id = ?`,
        [host, parseInt(port), String(secure), user, finalPassword, config.id]
      );
    } else {
      await pool.query(
        `INSERT INTO smtp_settings (host, port, secure, user, password)
         VALUES (?, ?, ?, ?, ?)`,
        [host, parseInt(port), String(secure), user, password || '']
      );
    }
    res.json({ success: true, message: 'SMTP settings successfully updated' });
  } catch (error) {
    console.error('Error saving SMTP settings:', error);
    res.status(500).json({ error: 'Failed to save SMTP settings' });
  }
});

// 5.5. Business Basic Information API Endpoints
app.get('/api/business-info', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM business_info LIMIT 1');
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Business basic information not found' });
    }
  } catch (error) {
    console.error('Error fetching business info:', error);
    res.status(500).json({ error: 'Failed to retrieve business basic information' });
  }
});

app.post('/api/business-info', requireAdmin, async (req, res) => {
  const { business_name, address, maps_url, phone, mobile, whatsapp, email } = req.body;
  if (!business_name || !address || !maps_url || !phone || !mobile || !whatsapp || !email) {
    return res.status(400).json({ error: 'All fields (business_name, address, maps_url, phone, mobile, whatsapp, email) are required' });
  }

  try {
    // Check if there is an existing record
    const [rows] = await pool.query('SELECT id FROM business_info LIMIT 1');
    if (rows.length > 0) {
      // Update existing record
      await pool.query(
        `UPDATE business_info 
         SET business_name = ?, address = ?, maps_url = ?, phone = ?, mobile = ?, whatsapp = ?, email = ?
         WHERE id = ?`,
        [business_name, address, maps_url, phone, mobile, whatsapp, email, rows[0].id]
      );
    } else {
      // Insert new record
      await pool.query(
        `INSERT INTO business_info (business_name, address, maps_url, phone, mobile, whatsapp, email)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [business_name, address, maps_url, phone, mobile, whatsapp, email]
      );
    }
    res.json({ success: true, message: 'Business basic information updated successfully' });
  } catch (error) {
    console.error('Error updating business info in database:', error);
    res.status(500).json({ error: 'Failed to update business basic information in database' });
  }
});

// 6. Gallery Image Upload API Endpoint
app.post('/api/admin/upload-image', requireAdmin, async (req, res) => {
  const { imageType, imageBytes } = req.body;
  if (!imageType || !imageBytes) {
    return res.status(400).json({ error: 'imageType and imageBytes (Base64 string) are required' });
  }

  const allowedTypes = ['hero_bg', 'heritage_left', 'heritage_right'];
  if (!allowedTypes.includes(imageType)) {
    return res.status(400).json({ error: 'Invalid imageType specified' });
  }

  try {
    // Validate base64 payload prefix
    if (!imageBytes.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image data format. Must be a base64 image data URI' });
    }

    const settingKey = `clay_oven_image_${imageType}`;

    // Store raw base64 data directly inside store_settings database
    await pool.query(
      `INSERT INTO store_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [settingKey, imageBytes]
    );

    console.log(`Successfully stored self-hosted image directly in database under key: ${settingKey}`);
    settingsCache = null;

    res.json({
      success: true,
      imageUrl: imageBytes,
      message: 'Gallery image uploaded and database persistent settings successfully updated.'
    });
  } catch (error) {
    console.error('Error saving uploaded image in database:', error);
    res.status(500).json({ error: 'Failed to process and save gallery image in database settings' });
  }
});

// 7. Order Notification Email Settings API Endpoints
app.get('/api/admin/notification-emails', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT email FROM order_notification_emails');
    const emails = rows.map(r => r.email);
    res.json(emails);
  } catch (error) {
    console.error('Error fetching notification emails:', error);
    res.status(500).json({ error: 'Failed to retrieve notification emails' });
  }
});

app.post('/api/admin/notification-emails', requireAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email parameter is required' });
  }

  try {
    await pool.query('INSERT IGNORE INTO order_notification_emails (email) VALUES (?)', [email]);
    res.json({ success: true, message: 'Notification email successfully added' });
  } catch (error) {
    console.error('Error adding notification email:', error);
    res.status(500).json({ error: 'Failed to add notification email' });
  }
});

app.delete('/api/admin/notification-emails/:email', requireAdmin, async (req, res) => {
  const { email } = req.params;
  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
  }

  try {
    await pool.query('DELETE FROM order_notification_emails WHERE email = ?', [email]);
    res.json({ success: true, message: 'Notification email successfully deleted' });
  } catch (error) {
    console.error('Error deleting notification email:', error);
    res.status(500).json({ error: 'Failed to delete notification email' });
  }
});

/* --- PRODUCTION DEPLOYMENT MIDDLEWARE --- */

// Always serve Vite build assets if dist/ folder exists
// This ensures Hostinger serves the frontend regardless of NODE_ENV
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  console.log('Serving Vite build assets from dist/ folder...');
  
  // Hashed assets (JS/CSS chunks) — cache aggressively for 1 year (immutable)
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    immutable: true
  }));

  // Non-hashed static files (images, etc.) — cache for 1 hour with ETag revalidation
  app.use(express.static(distPath, {
    maxAge: '1h',
    etag: true
  }));
  
  // Catch-all route to serve index.html for React client-side routing
  // Use no-cache for index.html so users always get the latest version
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
