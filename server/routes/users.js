import express from 'express';
import pool from '../db/pool.js';
import jwt from 'jsonwebtoken';
import { ADMIN_JWT_SECRET } from '../middleware/requireAdmin.js';

const router = express.Router();

router.get('/api/users/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
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

router.post('/api/users', async (req, res) => {
  const { email, name, picture, phone, eircode, address, dietaryPreferences } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }

  try {
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

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      const userObj = rows[0];
      delete userObj.password;

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

export default router;
