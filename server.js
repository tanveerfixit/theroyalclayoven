import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Resolve directories for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    console.error('Error saving user profile:', error);
    res.status(500).json({ error: 'Database update failed' });
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

if (process.env.NODE_ENV === 'production') {
  console.log('Running in PRODUCTION mode. Serving Vite build assets...');
  
  // Serve static files from Vite build output directory (dist)
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Catch-all route to serve index.html for React client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
