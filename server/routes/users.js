import express from 'express';
import pool from '../db/pool.js';
import { getAuthActor } from '../middleware/requireAdmin.js';

const router = express.Router();

router.get('/api/users/:email', async (req, res) => {
  const targetEmail = String(req.params.email || '').trim().toLowerCase();
  if (!targetEmail) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const actor = getAuthActor(req);
  if (!actor) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (actor.role !== 'admin' && actor.email !== targetEmail) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [targetEmail]);
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

  const normalizedEmail = String(email).trim().toLowerCase();
  const actor = getAuthActor(req);
  const isAuthorizedForEmail = Boolean(actor && (actor.role === 'admin' || actor.email === normalizedEmail));

  try {
    const [existingRows] = await pool.query('SELECT email FROM users WHERE LOWER(email) = ? LIMIT 1', [normalizedEmail]);

    if (existingRows.length > 0) {
      if (!isAuthorizedForEmail) {
        // Do not overwrite an existing account from an unauthenticated guest checkout/booking request
        return res.status(200).json({ skipped: true, email: normalizedEmail });
      }

      await pool.query(
        `UPDATE users
         SET name = ?,
             picture = COALESCE(?, picture),
             phone = COALESCE(?, phone),
             eircode = COALESCE(?, eircode),
             address = COALESCE(?, address),
             dietaryPreferences = COALESCE(?, dietaryPreferences)
         WHERE LOWER(email) = ?`,
        [
          name,
          picture || null,
          phone || null,
          eircode || null,
          address || null,
          dietaryPreferences || null,
          normalizedEmail
        ]
      );
    } else {
      // First-time guest profile creation (never grants admin privileges)
      await pool.query(
        `INSERT IGNORE INTO users (email, name, picture, phone, eircode, address, dietaryPreferences)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          normalizedEmail,
          name,
          picture || null,
          phone || null,
          eircode || null,
          address || null,
          dietaryPreferences || null
        ]
      );
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [normalizedEmail]);
    if (rows.length > 0) {
      const userObj = { ...rows[0] };
      delete userObj.password;
      res.json(userObj);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Database update failed' });
  }
});

export default router;
