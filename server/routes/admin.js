import express from 'express';
import pool from '../db/pool.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { requireAdmin, ADMIN_JWT_SECRET } from '../middleware/requireAdmin.js';
import { otpLimiter } from '../middleware/rateLimiters.js';
import { getMailSender, getTransporter, getSmtpConfig } from '../utils/email.js';
import { 
  ordersLastUpdated, updateOrdersLastUpdated,
  bookingsLastUpdated,
  setSmtpConfigCache,
  getOrderNotificationEmails, setNotifEmailsCache, notifEmailsCache, notifEmailsCacheTime, NOTIF_EMAILS_CACHE_TTL,
  invalidateMenuCache, clearSettingsCache, imageSettingsCache
} from '../cache/index.js';

const router = express.Router();

router.post('/api/admin/request-otp', otpLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  try {
    const [adminRows] = await pool.query('SELECT * FROM admin_emails WHERE email = ?', [email.toLowerCase().trim()]);
    if (adminRows.length === 0) {
      return res.status(403).json({ error: 'This email address is not authorized for admin access' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO admin_otps (email, otp, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
      [email.toLowerCase().trim(), hashedOtp, expiresAt]
    );

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
    res.json({ success: true, message: 'Access code has been sent to your email address.' });
  } catch (error) {
    console.error('Admin OTP request error:', error);
    res.status(500).json({ error: 'Failed to generate or send access code. Please try again.' });
  }
});

router.post('/api/admin/verify-otp', async (req, res) => {
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
    const hashedInput = crypto.createHash('sha256').update(otp.trim()).digest('hex');

    if (record.otp !== otp.trim() && record.otp !== hashedInput) {
      return res.status(400).json({ error: 'Incorrect access code. Please check your email and try again.' });
    }

    if (expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Access code has expired. Please request a new one.' });
    }

    await pool.query('DELETE FROM admin_otps WHERE email = ?', [email.toLowerCase().trim()]);

    const token = jwt.sign(
      { email: email.toLowerCase().trim(), role: 'admin' },
      ADMIN_JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ success: true, token, message: 'Authentication successful.' });
  } catch (error) {
    console.error('Admin OTP verification error:', error);
    res.status(500).json({ error: 'Failed to verify access code. Please try again.' });
  }
});

router.get('/api/admin/verify', (req, res) => {
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

router.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const clientSince = req.headers['if-modified-since']
      ? new Date(req.headers['if-modified-since']).getTime()
      : parseInt(req.query.since || '0', 10);

    if (clientSince && clientSince >= ordersLastUpdated) {
      return res.status(304).end();
    }

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
        cancellationReason: order.cancellation_reason || undefined,
        adminNotes: order.admin_notes || undefined,
        isArchived: order.is_archived === 1,
        createdAt: order.createdAt
      };
    });
    
    res.setHeader('Last-Modified', new Date(ordersLastUpdated).toUTCString());
    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

router.put('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, cancellationReason, adminNotes, sendEmail } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    let updateQuery = 'UPDATE orders SET status = ?';
    const params = [status];

    if (cancellationReason !== undefined) {
      updateQuery += ', cancellation_reason = ?';
      params.push(cancellationReason);
    }
    if (adminNotes !== undefined) {
      updateQuery += ', admin_notes = ?';
      params.push(adminNotes);
    }
    updateQuery += ' WHERE id = ?';
    params.push(id);

    const [result] = await pool.query(updateQuery, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    updateOrdersLastUpdated();
    res.json({ success: true, message: `Order status updated to ${status}` });

    if (status === 'Cancelled' && sendEmail !== false) {
      (async () => {
        try {
          const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
          if (rows.length > 0 && rows[0].customer_email) {
            const order = rows[0];
            const mailSender = await getMailSender();
            const activeTransporter = await getTransporter();
            
            const reasonText = cancellationReason || 'Kitchen unable to fulfil order at this time';
            const escapeHtml = (str) => str?.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g, '&#39;') || '';

            await activeTransporter.sendMail({
              from: `"The Royal Clay Oven" <${mailSender}>`,
              to: order.customer_email,
              subject: `Order Update - Order #${order.id} Cancelled`,
              html: `
                <div style="font-family: sans-serif; padding: 24px; max-width: 600px; margin: auto; border: 1px solid #eee; background-color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #C85A32; font-family: serif; margin: 0; letter-spacing: 0.1em; font-size: 28px;">THE ROYAL CLAY OVEN</h2>
                    <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #777; margin: 5px 0 0 0;">Order Cancellation Notification</p>
                  </div>
                  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p style="font-size: 14px; line-height: 1.5; color: #333;">Dear ${escapeHtml(order.customer_name)},</p>
                  <p style="font-size: 14px; line-height: 1.5; color: #333;">We sincerely apologize, but your order <strong>#${escapeHtml(order.id)}</strong> could not be accepted/completed and has been cancelled by our kitchen team.</p>
                  
                  <div style="background-color: #FFF5F5; border-left: 4px solid #E53E3E; padding: 16px; margin: 20px 0;">
                    <h4 style="color: #C53030; margin: 0 0 6px 0; font-size: 14px;">Reason for Cancellation:</h4>
                    <p style="margin: 0; font-size: 14px; color: #4A5568;">${escapeHtml(reasonText)}</p>
                  </div>

                  <p style="font-size: 13px; line-height: 1.5; color: #666;">If you have any questions or would like to speak directly with our team, please do not hesitate to contact us by phone at <strong>061 703 513</strong> or WhatsApp <strong>086 020 3720</strong>.</p>
                  
                  <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
                    The Royal Clay Oven &bull; Ballycasey Craft & Design Center, Shannon, Co. Clare
                  </div>
                </div>
              `
            });
          }
        } catch (mailErr) {
          console.error('Failed to send order cancellation email in background:', mailErr);
        }
      })();
    }
  } catch (error) {
    console.error('Error updating admin order status:', error);
    res.status(500).json({ error: 'Database update failed' });
  }
});

router.put('/api/admin/orders/:id/items', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { items, subtotal, total, adminNotes } = req.body;
  if (!items || subtotal === undefined || total === undefined) {
    return res.status(400).json({ error: 'Items, subtotal, and total are required' });
  }

  try {
    const serializedItems = JSON.stringify(items);
    let updateQuery = 'UPDATE orders SET items = ?, subtotal = ?, total = ?';
    const params = [serializedItems, subtotal, total];

    if (adminNotes !== undefined) {
      updateQuery += ', admin_notes = ?';
      params.push(adminNotes);
    }
    updateQuery += ' WHERE id = ?';
    params.push(id);

    const [result] = await pool.query(updateQuery, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    updateOrdersLastUpdated();
    res.json({ success: true, message: 'Order items updated successfully' });
  } catch (error) {
    console.error('Error updating order items:', error);
    res.status(500).json({ error: 'Database update failed' });
  }
});

router.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  try {
    const clientSince = req.headers['if-modified-since']
      ? new Date(req.headers['if-modified-since']).getTime()
      : parseInt(req.query.since || '0', 10);

    if (clientSince && clientSince >= bookingsLastUpdated) {
      return res.status(304).end();
    }

    const [rows] = await pool.query(
      'SELECT * FROM bookings ORDER BY date DESC, time DESC LIMIT 200'
    );
    res.setHeader('Last-Modified', new Date(bookingsLastUpdated).toUTCString());
    res.json(rows);
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

router.get('/api/admin/smtp', requireAdmin, async (req, res) => {
  try {
    const config = await getSmtpConfig();
    if (config) {
      res.json({
        host: config.host,
        port: config.port,
        secure: config.secure === 'true',
        user: config.user,
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

router.post('/api/admin/smtp', requireAdmin, async (req, res) => {
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
    setSmtpConfigCache(null, 0);
    res.json({ success: true, message: 'SMTP settings successfully updated' });
  } catch (error) {
    console.error('Error saving SMTP settings:', error);
    res.status(500).json({ error: 'Failed to save SMTP settings' });
  }
});

router.post('/api/admin/upload-image', requireAdmin, async (req, res) => {
  const { imageType, imageBytes } = req.body;
  if (!imageType || !imageBytes) {
    return res.status(400).json({ error: 'imageType and imageBytes (Base64 string) are required' });
  }

  const allowedTypes = ['hero_bg', 'heritage_left', 'heritage_right', 'festive_banner'];
  if (!allowedTypes.includes(imageType)) {
    return res.status(400).json({ error: 'Invalid imageType specified' });
  }

  try {
    if (!imageBytes.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image data format. Must be a base64 image data URI' });
    }

    const settingKey = `clay_oven_image_${imageType}`;

    await pool.query(
      `INSERT INTO store_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [settingKey, imageBytes]
    );

    clearSettingsCache();

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

router.post('/api/admin/delete-image', requireAdmin, async (req, res) => {
  const { imageType } = req.body;
  if (!imageType) {
    return res.status(400).json({ error: 'imageType is required' });
  }

  const settingKey = `clay_oven_image_${imageType}`;
  try {
    await pool.query('DELETE FROM store_settings WHERE setting_key = ?', [settingKey]);
    clearSettingsCache();
    res.json({ success: true, message: 'Image removed successfully' });
  } catch (error) {
    console.error('Error deleting image from database:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

router.get('/api/admin/notification-emails', requireAdmin, async (req, res) => {
  try {
    const now = Date.now();
    if (notifEmailsCache && (now - notifEmailsCacheTime) < NOTIF_EMAILS_CACHE_TTL) {
      return res.json(notifEmailsCache);
    }
    const emails = await getOrderNotificationEmails();
    res.json(emails);
  } catch (error) {
    console.error('Error fetching notification emails:', error);
    res.status(500).json({ error: 'Failed to retrieve notification emails' });
  }
});

router.post('/api/admin/notification-emails', requireAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email parameter is required' });
  }

  try {
    await pool.query('INSERT IGNORE INTO order_notification_emails (email) VALUES (?)', [email]);
    setNotifEmailsCache(null, 0);
    res.json({ success: true, message: 'Notification email successfully added' });
  } catch (error) {
    console.error('Error adding notification email:', error);
    res.status(500).json({ error: 'Failed to add notification email' });
  }
});

router.delete('/api/admin/notification-emails/:email', requireAdmin, async (req, res) => {
  const { email } = req.params;
  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
  }

  try {
    await pool.query('DELETE FROM order_notification_emails WHERE email = ?', [email]);
    setNotifEmailsCache(null, 0);
    res.json({ success: true, message: 'Notification email successfully deleted' });
  } catch (error) {
    console.error('Error deleting notification email:', error);
    res.status(500).json({ error: 'Failed to delete notification email' });
  }
});

router.post('/api/admin/categories', requireAdmin, async (req, res) => {
  const { name, description, display_order, is_active, image_url, option_group_ids } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
  try {
    let finalOrder = parseInt(display_order);
    if (isNaN(finalOrder) || display_order === undefined || display_order === null) {
      const [maxRows] = await pool.query('SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM menu_categories');
      finalOrder = maxRows[0].next_order;
    }

    const [result] = await pool.query(`
      INSERT INTO menu_categories (name, slug, description, display_order, is_active, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      slug,
      description || '',
      finalOrder,
      is_active !== undefined ? Boolean(is_active) : true,
      image_url || null
    ]);

    const categoryId = result.insertId;

    if (Array.isArray(option_group_ids) && option_group_ids.length > 0) {
      for (let i = 0; i < option_group_ids.length; i++) {
        await pool.query(`
          INSERT INTO category_option_groups (category_id, group_id, display_order)
          VALUES (?, ?, ?)
        `, [categoryId, option_group_ids[i], i + 1]);
      }
    }

    invalidateMenuCache();
    res.json({ success: true, categoryId, message: 'Category created successfully' });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, display_order, is_active, image_url, option_group_ids } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    const [existingRows] = await pool.query('SELECT display_order FROM menu_categories WHERE id = ?', [id]);
    const currentOrder = existingRows.length > 0 ? existingRows[0].display_order : 0;
    const finalOrder = (display_order !== undefined && display_order !== null && !isNaN(parseInt(display_order)))
      ? parseInt(display_order)
      : currentOrder;

    await pool.query(`
      UPDATE menu_categories
      SET name = ?, description = ?, display_order = ?, is_active = ?, image_url = ?
      WHERE id = ?
    `, [
      name.trim(),
      description || '',
      finalOrder,
      is_active !== undefined ? Boolean(is_active) : true,
      image_url || null,
      id
    ]);

    if (Array.isArray(option_group_ids)) {
      await pool.query('DELETE FROM category_option_groups WHERE category_id = ?', [id]);
      for (let i = 0; i < option_group_ids.length; i++) {
        await pool.query(`
          INSERT INTO category_option_groups (category_id, group_id, display_order)
          VALUES (?, ?, ?)
        `, [id, option_group_ids[i], i + 1]);
      }
    }

    invalidateMenuCache();
    res.json({ success: true, message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM menu_categories WHERE id = ?', [id]);
    invalidateMenuCache();
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

router.post('/api/admin/categories/reorder', requireAdmin, async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds array is required' });
  }

  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await pool.query('UPDATE menu_categories SET display_order = ? WHERE id = ?', [i + 1, orderedIds[i]]);
    }
    invalidateMenuCache();
    res.json({ success: true, message: 'Categories reordered successfully' });
  } catch (error) {
    console.error('Error reordering categories:', error);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

router.post('/api/admin/products', requireAdmin, async (req, res) => {
  const {
    id: customId,
    category_id,
    name,
    description,
    base_price,
    is_veg,
    is_active,
    is_sold_out,
    allergens,
    size_options,
    image_url,
    display_order,
    option_group_ids
  } = req.body;

  if (!category_id || !name || base_price === undefined) {
    return res.status(400).json({ error: 'category_id, name, and base_price are required' });
  }

  let productId = (customId && typeof customId === 'string' && customId.trim())
    ? customId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-')
    : '';

  if (!productId) {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dish';
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    productId = `${slug}-${randomSuffix}`;
  }

  try {
    const [existing] = await pool.query('SELECT id FROM menu_products WHERE id = ?', [productId]);
    if (existing.length > 0) {
      productId = `${productId}-${Date.now().toString(36)}`;
    }

    let finalOrder = parseInt(display_order);
    if (isNaN(finalOrder) || display_order === undefined || display_order === null) {
      const [maxRows] = await pool.query('SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM menu_products WHERE category_id = ?', [category_id]);
      finalOrder = maxRows[0].next_order;
    }

    await pool.query(`
      INSERT INTO menu_products 
      (id, category_id, name, description, base_price, is_veg, is_active, is_sold_out, allergens, size_options, image_url, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      productId,
      parseInt(category_id),
      name.trim(),
      description || '',
      parseFloat(base_price),
      is_veg !== undefined ? Boolean(is_veg) : false,
      is_active !== undefined ? Boolean(is_active) : true,
      is_sold_out !== undefined ? Boolean(is_sold_out) : false,
      allergens ? JSON.stringify(allergens) : null,
      size_options ? JSON.stringify(size_options) : null,
      image_url || null,
      finalOrder
    ]);

    if (Array.isArray(option_group_ids) && option_group_ids.length > 0) {
      for (let i = 0; i < option_group_ids.length; i++) {
        await pool.query(`
          INSERT INTO product_option_groups (product_id, group_id, display_order)
          VALUES (?, ?, ?)
        `, [productId, option_group_ids[i], i + 1]);
      }
    }

    invalidateMenuCache();
    res.json({ success: true, productId, message: 'Dish created successfully' });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message || 'Failed to create product' });
  }
});

router.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    category_id,
    name,
    description,
    base_price,
    is_veg,
    is_active,
    is_sold_out,
    allergens,
    size_options,
    image_url,
    display_order,
    option_group_ids
  } = req.body;

  if (!category_id || !name || base_price === undefined) {
    return res.status(400).json({ error: 'category_id, name, and base_price are required' });
  }

  try {
    const [existingRows] = await pool.query('SELECT display_order FROM menu_products WHERE id = ?', [id]);
    const currentOrder = existingRows.length > 0 ? existingRows[0].display_order : 0;
    const finalOrder = (display_order !== undefined && display_order !== null && !isNaN(parseInt(display_order)))
      ? parseInt(display_order)
      : currentOrder;

    await pool.query(`
      UPDATE menu_products
      SET category_id = ?, name = ?, description = ?, base_price = ?, is_veg = ?, 
          is_active = ?, is_sold_out = ?, allergens = ?, size_options = ?, image_url = ?, display_order = ?
      WHERE id = ?
    `, [
      parseInt(category_id),
      name.trim(),
      description || '',
      parseFloat(base_price),
      is_veg !== undefined ? Boolean(is_veg) : false,
      is_active !== undefined ? Boolean(is_active) : true,
      is_sold_out !== undefined ? Boolean(is_sold_out) : false,
      allergens ? JSON.stringify(allergens) : null,
      size_options ? JSON.stringify(size_options) : null,
      image_url || null,
      finalOrder,
      id
    ]);

    if (Array.isArray(option_group_ids)) {
      await pool.query('DELETE FROM product_option_groups WHERE product_id = ?', [id]);
      for (let i = 0; i < option_group_ids.length; i++) {
        await pool.query(`
          INSERT INTO product_option_groups (product_id, group_id, display_order)
          VALUES (?, ?, ?)
        `, [id, option_group_ids[i], i + 1]);
      }
    }

    invalidateMenuCache();
    res.json({ success: true, message: 'Dish updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.patch('/api/admin/products/:id/toggle-stock', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_sold_out } = req.body;
  try {
    if (is_sold_out !== undefined) {
      await pool.query('UPDATE menu_products SET is_sold_out = ? WHERE id = ?', [Boolean(is_sold_out), id]);
    } else {
      await pool.query('UPDATE menu_products SET is_sold_out = NOT is_sold_out WHERE id = ?', [id]);
    }
    invalidateMenuCache();
    res.json({ success: true, message: 'Stock status updated successfully' });
  } catch (error) {
    console.error('Error toggling product stock:', error);
    res.status(500).json({ error: 'Failed to update stock status' });
  }
});

router.patch('/api/admin/products/:id/toggle-active', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    if (is_active !== undefined) {
      await pool.query('UPDATE menu_products SET is_active = ? WHERE id = ?', [Boolean(is_active), id]);
    } else {
      await pool.query('UPDATE menu_products SET is_active = NOT is_active WHERE id = ?', [id]);
    }
    invalidateMenuCache();
    res.json({ success: true, message: 'Active status updated successfully' });
  } catch (error) {
    console.error('Error toggling product active status:', error);
    res.status(500).json({ error: 'Failed to update active status' });
  }
});

router.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM menu_products WHERE id = ?', [id]);
    invalidateMenuCache();
    res.json({ success: true, message: 'Dish deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete dish' });
  }
});

router.post('/api/admin/option-groups', requireAdmin, async (req, res) => {
  const { title, min_selection, max_selection, is_active, options } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Group title is required' });
  }

  try {
    const [result] = await pool.query(`
      INSERT INTO option_groups (title, min_selection, max_selection, is_active)
      VALUES (?, ?, ?, ?)
    `, [
      title.trim(),
      parseInt(min_selection !== undefined ? min_selection : 0),
      parseInt(max_selection !== undefined ? max_selection : 1),
      is_active !== undefined ? Boolean(is_active) : true
    ]);

    const groupId = result.insertId;

    if (Array.isArray(options) && options.length > 0) {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.name && opt.name.trim()) {
          await pool.query(`
            INSERT INTO option_items (group_id, name, price_modifier, is_default, display_order)
            VALUES (?, ?, ?, ?, ?)
          `, [
            groupId,
            opt.name.trim(),
            parseFloat(opt.priceModifier || opt.price_modifier || 0),
            Boolean(opt.isDefault || opt.is_default),
            i + 1
          ]);
        }
      }
    }

    invalidateMenuCache();
    res.json({ success: true, groupId, message: 'Option group created successfully' });
  } catch (error) {
    console.error('Error creating option group:', error);
    res.status(500).json({ error: 'Failed to create option group' });
  }
});

router.put('/api/admin/option-groups/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, min_selection, max_selection, is_active, options } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Group title is required' });
  }

  try {
    await pool.query(`
      UPDATE option_groups
      SET title = ?, min_selection = ?, max_selection = ?, is_active = ?
      WHERE id = ?
    `, [
      title.trim(),
      parseInt(min_selection !== undefined ? min_selection : 0),
      parseInt(max_selection !== undefined ? max_selection : 1),
      is_active !== undefined ? Boolean(is_active) : true,
      id
    ]);

    if (Array.isArray(options)) {
      await pool.query('DELETE FROM option_items WHERE group_id = ?', [id]);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.name && opt.name.trim()) {
          await pool.query(`
            INSERT INTO option_items (group_id, name, price_modifier, is_default, display_order)
            VALUES (?, ?, ?, ?, ?)
          `, [
            id,
            opt.name.trim(),
            parseFloat(opt.priceModifier || opt.price_modifier || 0),
            Boolean(opt.isDefault || opt.is_default),
            i + 1
          ]);
        }
      }
    }

    invalidateMenuCache();
    res.json({ success: true, message: 'Option group updated successfully' });
  } catch (error) {
    console.error('Error updating option group:', error);
    res.status(500).json({ error: 'Failed to update option group' });
  }
});

router.delete('/api/admin/option-groups/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM option_groups WHERE id = ?', [id]);
    invalidateMenuCache();
    res.json({ success: true, message: 'Option group deleted successfully' });
  } catch (error) {
    console.error('Error deleting option group:', error);
    res.status(500).json({ error: 'Failed to delete option group' });
  }
});

router.post('/api/admin/deals', requireAdmin, async (req, res) => {
  const { id: customId, title, description, bundle_price, badge_text, is_active, image_url, steps } = req.body;
  if (!title || bundle_price === undefined) {
    return res.status(400).json({ error: 'Deal title and bundle_price are required' });
  }

  const dealId = (customId && customId.trim()) 
    ? customId.trim() 
    : 'deal-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

  try {
    await pool.query(`
      INSERT INTO menu_deals (id, title, description, bundle_price, badge_text, is_active, image_url, steps)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      dealId,
      title.trim(),
      description || '',
      parseFloat(bundle_price),
      badge_text || null,
      is_active !== undefined ? Boolean(is_active) : true,
      image_url || null,
      steps ? JSON.stringify(steps) : null
    ]);

    invalidateMenuCache();
    res.json({ success: true, dealId, message: 'Deal created successfully' });
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

router.put('/api/admin/deals/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, bundle_price, badge_text, is_active, image_url, steps } = req.body;
  if (!title || bundle_price === undefined) {
    return res.status(400).json({ error: 'Deal title and bundle_price are required' });
  }

  try {
    await pool.query(`
      UPDATE menu_deals
      SET title = ?, description = ?, bundle_price = ?, badge_text = ?, is_active = ?, image_url = ?, steps = ?
      WHERE id = ?
    `, [
      title.trim(),
      description || '',
      parseFloat(bundle_price),
      badge_text || null,
      is_active !== undefined ? Boolean(is_active) : true,
      image_url || null,
      steps ? JSON.stringify(steps) : null,
      id
    ]);

    invalidateMenuCache();
    res.json({ success: true, message: 'Deal updated successfully' });
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

router.delete('/api/admin/deals/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM menu_deals WHERE id = ?', [id]);
    invalidateMenuCache();
    res.json({ success: true, message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

export default router;
