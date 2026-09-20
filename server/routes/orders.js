import express from 'express';
import pool from '../db/pool.js';
import { getMailSender, getTransporter, getOrderNotificationEmails, escapeHtml } from '../utils/email.js';
import { orderLimiter } from '../middleware/rateLimiters.js';
import { ordersLastUpdated, updateOrdersLastUpdated } from '../cache/index.js';

const router = express.Router();

router.get('/api/orders', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email query parameter is required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM orders WHERE customer_email = ? ORDER BY createdAt DESC',
      [email]
    );
    
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
        cancellationReason: order.cancellation_reason || undefined,
        adminNotes: order.admin_notes || undefined,
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

router.post('/api/orders', orderLimiter, async (req, res) => {
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
    
    const recipientEmails = await getOrderNotificationEmails();

    if (recipientEmails.length > 0) {
      const activeTransporter = await getTransporter();
      
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
        let modifiersHtml = '';
        if (item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
          modifiersHtml = '<div style="margin-top: 4px; padding: 4px 6px; background: #faf8f5; border-left: 2px solid #C85A32; font-size: 11px;">';
          for (const mod of item.modifiers) {
            const mQty = mod.quantity || 1;
            const isFree = !mod.price || mod.price === 0;
            const mPriceText = isFree ? '<span style="color: #059669; font-weight: bold;">[FREE]</span>' : `<span style="color: #b45309; font-weight: bold;">[+&euro;${((mod.price || 0) * mQty).toFixed(2)}]</span>`;
            const mQtyText = mQty > 1 ? `<strong>${mQty}x </strong>` : '';
            const mGroup = mod.groupTitle ? `<span style="color: #666;">${escapeHtml(mod.groupTitle)}: </span>` : '';
            modifiersHtml += `<div style="margin-bottom: 2px;">• ${mGroup}${mQtyText}${escapeHtml(mod.optionName || '')} ${mPriceText}</div>`;
          }
          modifiersHtml += '</div>';
        }

        itemsHtml += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">
              <strong>${escapeHtml(item.name || item.menuItem?.name || '')}</strong>
              ${modifiersHtml}
              ${item.notes ? `<div style="font-size: 11px; color: #C85A32; font-style: italic; margin-top: 3px;">"${escapeHtml(item.notes)}"</div>` : ''}
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
                <td style="padding: 4px 0; font-weight: bold;"><a href="tel:${escapeHtml(customerInfo.phone.replace(/\\s+/g, ''))}">${escapeHtml(customerInfo.phone)}</a></td>
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

    updateOrdersLastUpdated();
    res.status(201).json({ success: true, orderId: id });
  } catch (error) {
    console.error('Error inserting order:', error);
    res.status(500).json({ error: 'Database save failed' });
  }
});

router.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('UPDATE orders SET is_archived = 1 WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    updateOrdersLastUpdated();
    res.json({ success: true, message: 'Order receipt log soft deleted' });
  } catch (error) {
    console.error('Error archiving order:', error);
    res.status(500).json({ error: 'Database archiving failed' });
  }
});

export default router;
