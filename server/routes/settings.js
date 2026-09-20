import express from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { 
  settingsCache, settingsCacheTime, SETTINGS_CACHE_TTL, setSettingsCache, clearSettingsCache, imageSettingsCache,
  businessInfoCache, businessInfoCacheTime, BIZ_INFO_CACHE_TTL, setBusinessInfoCache, clearBusinessInfoCache
} from '../cache/index.js';

const router = express.Router();

router.get('/api/settings', async (req, res) => {
  try {
    const now = Date.now();
    if (settingsCache && (now - settingsCacheTime) < SETTINGS_CACHE_TTL) {
      return res.json(settingsCache);
    }
    const [rows] = await pool.query('SELECT * FROM store_settings');
    const settingsObj = {};
    rows.forEach(row => {
      if (!row.setting_key.startsWith('clay_oven_image_') && !row.setting_key.startsWith('clay_oven_dish_image_')) {
        settingsObj[row.setting_key] = row.setting_value;
      }
    });
    setSettingsCache(settingsObj, now);
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching store settings:', error);
    res.status(500).json({ error: 'Failed to retrieve storefront settings' });
  }
});

router.get('/api/settings/images/:key', async (req, res) => {
  const { key } = req.params;
  if (!key.startsWith('clay_oven_image_') && !key.startsWith('clay_oven_dish_image_')) {
    return res.status(400).json({ error: 'Only image setting keys are allowed' });
  }

  if (imageSettingsCache.has(key)) {
    return res.json({ key, value: imageSettingsCache.get(key) });
  }

  try {
    const [rows] = await pool.query('SELECT setting_value FROM store_settings WHERE setting_key = ? LIMIT 1', [key]);
    if (rows.length > 0 && rows[0].setting_value) {
      imageSettingsCache.set(key, rows[0].setting_value);
      res.json({ key, value: rows[0].setting_value });
    } else {
      res.status(404).json({ error: 'Image setting not found' });
    }
  } catch (error) {
    console.error('Error fetching image setting:', error);
    res.status(500).json({ error: 'Failed to retrieve image setting' });
  }
});

router.post('/api/settings', requireAdmin, async (req, res) => {
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
    clearSettingsCache();
    res.json({ success: true, message: 'Settings successfully synchronized with server database' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating store settings in database:', error);
    res.status(500).json({ error: 'Failed to update storefront settings in database' });
  } finally {
    connection.release();
  }
});

router.get('/api/business-info', async (req, res) => {
  try {
    const now = Date.now();
    if (businessInfoCache && (now - businessInfoCacheTime) < BIZ_INFO_CACHE_TTL) {
      return res.json(businessInfoCache);
    }

    const [rows] = await pool.query('SELECT * FROM business_info LIMIT 1');
    if (rows.length > 0) {
      setBusinessInfoCache(rows[0], now);
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Business basic information not found' });
    }
  } catch (error) {
    console.error('Error fetching business info:', error);
    res.status(500).json({ error: 'Failed to retrieve business basic information' });
  }
});

router.post('/api/business-info', requireAdmin, async (req, res) => {
  const { business_name, address, maps_url, phone, mobile, whatsapp, email } = req.body;
  if (!business_name || !address || !maps_url || !phone || !mobile || !whatsapp || !email) {
    return res.status(400).json({ error: 'All fields (business_name, address, maps_url, phone, mobile, whatsapp, email) are required' });
  }

  try {
    const [rows] = await pool.query('SELECT id FROM business_info LIMIT 1');
    if (rows.length > 0) {
      await pool.query(
        `UPDATE business_info 
         SET business_name = ?, address = ?, maps_url = ?, phone = ?, mobile = ?, whatsapp = ?, email = ?
         WHERE id = ?`,
        [business_name, address, maps_url, phone, mobile, whatsapp, email, rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO business_info (business_name, address, maps_url, phone, mobile, whatsapp, email)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [business_name, address, maps_url, phone, mobile, whatsapp, email]
      );
    }
    clearBusinessInfoCache();
    res.json({ success: true, message: 'Business basic information updated successfully' });
  } catch (error) {
    console.error('Error updating business info in database:', error);
    res.status(500).json({ error: 'Failed to update business basic information in database' });
  }
});

export default router;
