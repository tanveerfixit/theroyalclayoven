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

// Nodemailer Mail Transporter Configuration for Hostinger
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // avoids SSL certificate verification issues
  }
});

// Middleware
app.use(cors());
app.use(express.json());

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

// Verify connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database pool initialized successfully. Connected to Hostinger MariaDB/MySQL.');
    connection.release();
  } catch (error) {
    console.error('Database connection pool initialization failed:', error);
    process.exit(1);
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

    res.json({
      status: 'CONNECTED',
      database: process.env.DB_DATABASE || 'NOT SET',
      host: dbHost,
      connectionType,
      nodeEnv: process.env.NODE_ENV || 'NOT SET',
      port: process.env.PORT || 'NOT SET',
      serverTime: new Date().toISOString(),
      message: `Database is connected via ${connectionType}`
    });
  } catch (error) {
    res.status(500).json({
      status: 'DISCONNECTED',
      database: process.env.DB_DATABASE || 'NOT SET',
      host: dbHost,
      connectionType,
      nodeEnv: process.env.NODE_ENV || 'NOT SET',
      port: process.env.PORT || 'NOT SET',
      serverTime: new Date().toISOString(),
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

    await transporter.sendMail(mailOptions);
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
    res.status(201).json({ success: true, bookingId: id });
  } catch (error) {
    console.error('Error inserting booking:', error);
    res.status(500).json({ error: 'Database save failed' });
  }
});

app.put('/api/bookings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
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
