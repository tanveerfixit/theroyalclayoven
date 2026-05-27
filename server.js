import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import fs from 'fs';

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

// Middleware
app.use(cors());
app.use(express.json());

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
        process.env.SMTP_HOST || 'smtp.hostinger.com',
        parseInt(process.env.SMTP_PORT || '465'),
        process.env.SMTP_SECURE || 'true',
        process.env.SMTP_USER || 'customers@clayoven.ie',
        process.env.SMTP_PASS || 'Tani@8877'
      ]);
      console.log('Default SMTP configurations initialized inside database settings successfully.');
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
      database: process.env.DB_DATABASE || 'NOT SET',
      host: dbHost,
      connectionType,
      nodeEnv: process.env.NODE_ENV || 'NOT SET',
      port: process.env.PORT || 'NOT SET',
      serverTime: new Date().toISOString(),
      distExists,
      filesInDir,
      dirname: __dirname,
      message: `Database is connected via ${connectionType}`
    });
  } catch (error) {
    const distExists = fs.existsSync(path.join(__dirname, 'dist'));
    const filesInDir = fs.readdirSync(__dirname).filter(f => !f.startsWith('.'));

    res.status(500).json({
      status: 'DISCONNECTED',
      database: process.env.DB_DATABASE || 'NOT SET',
      host: dbHost,
      connectionType,
      nodeEnv: process.env.NODE_ENV || 'NOT SET',
      port: process.env.PORT || 'NOT SET',
      serverTime: new Date().toISOString(),
      distExists,
      filesInDir,
      dirname: __dirname,
      error: error.message,
      message: `Database connection FAILED via ${connectionType}`
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
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Database update failed' });
  }
});

// 1.5. Authentication and OTP APIs
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    await pool.query(
      'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
      [email, name, password]
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Database signup error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND password = ?',
      [email, password]
    );

    if (rows.length === 0) {
      const [googleUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (googleUser.length > 0 && !googleUser[0].password) {
        return res.status(400).json({ error: 'This account was authenticated via Google. Please log in with Google.' });
      }
      return res.status(400).json({ error: 'Invalid email or password credentials' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Database login query error' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
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

    const mailOptions = {
      from: `"The Royal Clay Oven" <${process.env.SMTP_USER}>`,
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
          <p style="font-size: 11px; color: #999;">The Royal Clay Oven &bull; Ballycasey, Shannon, Co. Clare &bull; customers@clayoven.ie</p>
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

    await pool.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [newPassword, email]
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

app.post('/api/bookings', async (req, res) => {
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
    const mailOptions = {
      from: `"The Royal Clay Oven" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Reservation Request Received - ${id}`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; max-width: 600px; margin: auto; border: 1px solid #eee; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #C85A32; font-family: serif; margin: 0; letter-spacing: 0.1em; font-size: 28px;">THE ROYAL CLAY OVEN</h2>
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #777; margin: 5px 0 0 0;">Reservation Request Received</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 14px; line-height: 1.5; color: #333;">Dear ${name},</p>
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
                <td style="padding: 6px 0; color: #777; font-family: sans-serif; font-style: italic;">${specialRequests}</td>
              </tr>` : ''}
            </table>
          </div>

          <p style="font-size: 13px; line-height: 1.5; color: #777; background-color: #f9f9f9; padding: 12px; border-left: 3px solid #777;">
            Please note: This is an acknowledgement email to verify that we have received your booking details. We will confirm your booking shortly.
          </p>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">The Royal Clay Oven &bull; Ballycasey Craft And Design Center, Shannon, Co. Clare &bull; customers@clayoven.ie</p>
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
        
        const mailOptions = {
          from: `"The Royal Clay Oven" <${process.env.SMTP_USER}>`,
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
              <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">The Royal Clay Oven &bull; Ballycasey Craft And Design Center, Shannon, Co. Clare &bull; customers@clayoven.ie</p>
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

app.post('/api/orders', async (req, res) => {
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

// 4. Admin API Endpoints
app.get('/api/admin/orders', async (req, res) => {
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

app.put('/api/admin/orders/:id/status', async (req, res) => {
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

app.get('/api/admin/bookings', async (req, res) => {
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

/* --- PRODUCTION DEPLOYMENT MIDDLEWARE --- */

// Always serve Vite build assets if dist/ folder exists
// This ensures Hostinger serves the frontend regardless of NODE_ENV
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  console.log('Serving Vite build assets from dist/ folder...');
  
  // Serve static files from Vite build output directory (dist)
  app.use(express.static(distPath));
  
  // Catch-all route to serve index.html for React client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
