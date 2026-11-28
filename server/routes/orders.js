import express from 'express';
import crypto from 'crypto';
import pool from '../db/pool.js';
import { getMailSender, getTransporter, getOrderNotificationEmails, escapeHtml } from '../utils/email.js';
import { orderLimiter, voucherValidateLimiter } from '../middleware/rateLimiters.js';
import { getAuthActor } from '../middleware/requireAdmin.js';
import { updateOrdersLastUpdated } from '../cache/index.js';
import { evaluateVoucherOrPromo } from '../utils/vouchers.js';

const router = express.Router();

router.post('/api/vouchers/validate', voucherValidateLimiter, async (req, res) => {
  const { code, subtotal } = req.body || {};
  if (!code || String(code).trim() === '') {
    return res.status(400).json({ valid: false, error: 'Please enter a voucher or promo code.' });
  }

  try {
    const result = await evaluateVoucherOrPromo(pool, code, subtotal);
    if (!result.valid) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error('Error validating voucher:', error);
    return res.status(500).json({ valid: false, error: 'Failed to validate voucher code.' });
  }
});

router.get('/api/orders', async (req, res) => {
  const targetEmail = String(req.query.email || '').trim().toLowerCase();
  if (!targetEmail) {
    return res.status(400).json({ error: 'Email query parameter is required' });
  }

  const actor = getAuthActor(req);
  if (!actor) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (actor.role !== 'admin' && actor.email !== targetEmail) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM orders WHERE LOWER(customer_email) = ? ORDER BY createdAt DESC',
      [targetEmail]
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
        deliveryFee: order.deliveryFee != null ? parseFloat(order.deliveryFee) : undefined,
        discountCode: order.discountCode || undefined,
        discountAmount: order.discountAmount != null ? parseFloat(order.discountAmount) : 0,
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

/**
 * Computes authoritative item prices, subtotal, packaging fee, and delivery fee from the DB catalog & settings.
 */
async function computeAuthoritativePricing(connection, rawItems, serviceType, deliveryZoneName) {
  const [productRows] = await connection.query(
    'SELECT id, name, base_price, size_options FROM menu_products'
  );
  const [dealRows] = await connection.query(
    'SELECT id, title, bundle_price FROM menu_deals'
  );
  const [optionRows] = await connection.query(
    'SELECT id, name, price_modifier FROM option_items'
  );
  const [settingRows] = await connection.query(
    `SELECT setting_key, setting_value FROM store_settings
     WHERE setting_key IN ('clay_oven_takeaway_charges', 'clay_oven_delivery_charges', 'clay_oven_delivery_zones')`
  );

  const productById = new Map();
  const productByName = new Map();
  for (const p of productRows) {
    let parsedSizes = [];
    try {
      parsedSizes = typeof p.size_options === 'string' ? JSON.parse(p.size_options) : (p.size_options || []);
    } catch {
      parsedSizes = [];
    }
    const entry = { id: String(p.id), name: p.name, basePrice: parseFloat(p.base_price) || 0, sizes: parsedSizes };
    productById.set(String(p.id), entry);
    productByName.set(String(p.name).trim().toLowerCase(), entry);
  }

  const dealById = new Map();
  const dealByTitle = new Map();
  for (const d of dealRows) {
    const entry = { id: String(d.id), title: d.title, bundlePrice: parseFloat(d.bundle_price) || 0 };
    dealById.set(String(d.id), entry);
    dealById.set(`DEAL-${d.id}`, entry);
    dealByTitle.set(String(d.title).trim().toLowerCase(), entry);
  }

  const optionById = new Map();
  const optionByName = new Map();
  for (const opt of optionRows) {
    const price = parseFloat(opt.price_modifier) || 0;
    optionById.set(String(opt.id), price);
    optionByName.set(String(opt.name).trim().toLowerCase(), price);
  }

  const settings = {};
  for (const row of settingRows) {
    settings[row.setting_key] = row.setting_value;
  }

  const verifiedItems = [];
  let verifiedSubtotal = 0;

  for (const raw of rawItems) {
    const qty = Math.max(1, Math.min(100, parseInt(raw.quantity, 10) || 1));
    const itemName = String(raw.name || '').trim();
    const cleanName = itemName.replace(/^🎁\s*/, '').trim().toLowerCase();
    const rawId = raw.id != null ? String(raw.id) : '';

    let basePrice = null;

    // 1. Check deals
    const matchedDeal =
      (rawId && dealById.get(rawId)) ||
      (rawId.startsWith('DEAL-') && dealById.get(rawId.slice(5))) ||
      dealByTitle.get(cleanName);

    if (matchedDeal) {
      basePrice = matchedDeal.bundlePrice;
    } else {
      // 2. Check menu products
      const matchedProduct =
        (rawId && productById.get(rawId)) ||
        productByName.get(itemName.toLowerCase());

      if (matchedProduct) {
        if (raw.size && Array.isArray(matchedProduct.sizes) && matchedProduct.sizes.length > 0) {
          const matchedSize = matchedProduct.sizes.find(
            (s) => String(s.name || '').trim().toLowerCase() === String(raw.size).trim().toLowerCase()
          );
          basePrice = matchedSize ? parseFloat(matchedSize.price) : matchedProduct.basePrice;
        } else {
          basePrice = matchedProduct.basePrice;
        }
      }
    }

    // Compute modifier prices from option_items when available
    let modExtra = 0;
    const sanitizedModifiers = [];
    if (Array.isArray(raw.modifiers)) {
      for (const m of raw.modifiers) {
        const mQty = Math.max(1, Math.min(20, parseInt(m.quantity, 10) || 1));
        let unitModPrice = null;
        if (m.optionId != null && optionById.has(String(m.optionId))) {
          unitModPrice = optionById.get(String(m.optionId));
        } else if (m.optionName && optionByName.has(String(m.optionName).trim().toLowerCase())) {
          unitModPrice = optionByName.get(String(m.optionName).trim().toLowerCase());
        } else {
          unitModPrice = Math.max(0, parseFloat(m.price) || 0);
        }
        modExtra += unitModPrice * mQty;
        sanitizedModifiers.push({ ...m, price: unitModPrice, quantity: mQty });
      }
    }

    // Fallback for any item not in DB catalog: require positive non-zero price
    let unitPrice;
    if (basePrice !== null && Number.isFinite(basePrice)) {
      unitPrice = Number((basePrice + modExtra).toFixed(2));
    } else {
      const clientPrice = parseFloat(raw.price);
      if (!Number.isFinite(clientPrice) || clientPrice <= 0) {
        return { error: `Invalid price for item "${itemName || 'unknown'}".` };
      }
      unitPrice = Number(clientPrice.toFixed(2));
    }

    verifiedSubtotal += unitPrice * qty;
    verifiedItems.push({
      ...raw,
      name: itemName,
      quantity: qty,
      price: unitPrice,
      modifiers: sanitizedModifiers.length > 0 ? sanitizedModifiers : raw.modifiers,
    });
  }

  verifiedSubtotal = Number(verifiedSubtotal.toFixed(2));

  const takeawayChargeSetting = parseFloat(settings.clay_oven_takeaway_charges);
  const verifiedPackaging =
    verifiedSubtotal > 0
      ? Number((Number.isFinite(takeawayChargeSetting) ? Math.max(0, takeawayChargeSetting) : 0.95).toFixed(2))
      : 0;

  let verifiedDeliveryFee = 0;
  if (serviceType === 'delivery') {
    const defaultDeliveryCharge = parseFloat(settings.clay_oven_delivery_charges);
    const fallbackFee = Number.isFinite(defaultDeliveryCharge) ? Math.max(0, defaultDeliveryCharge) : 3.0;

    let zones = [];
    try {
      if (settings.clay_oven_delivery_zones) {
        const parsed = JSON.parse(settings.clay_oven_delivery_zones);
        if (Array.isArray(parsed)) zones = parsed;
      }
    } catch {
      zones = [];
    }

    const activeZones = zones.filter((z) => z && z.isActive !== false);
    const matchedZone = deliveryZoneName
      ? activeZones.find((z) => String(z.name || '').trim().toLowerCase() === String(deliveryZoneName).trim().toLowerCase())
      : activeZones[0];

    if (matchedZone && Number.isFinite(parseFloat(matchedZone.fee))) {
      verifiedDeliveryFee = Number(Math.max(0, parseFloat(matchedZone.fee)).toFixed(2));
    } else {
      verifiedDeliveryFee = Number(fallbackFee.toFixed(2));
    }
  }

  return {
    verifiedItems,
    verifiedSubtotal,
    verifiedPackaging,
    verifiedDeliveryFee,
  };
}

router.post('/api/orders', orderLimiter, async (req, res) => {
  const { items, deliveryZone, discountCode, serviceType, customerInfo, createdAt } = req.body;
  if (!Array.isArray(items) || items.length === 0 || !serviceType || !customerInfo || !customerInfo.name || !customerInfo.email || !customerInfo.phone) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }
  if (!['takeaway', 'delivery'].includes(serviceType)) {
    return res.status(400).json({ error: 'Invalid serviceType' });
  }

  const safeStatus = 'Received';
  const safeCreatedAt = createdAt || new Date().toISOString();
  const normalizedCustomerEmail = String(customerInfo.email).trim().toLowerCase();

  let finalOrderId = `CO-${crypto.randomInt(100000, 1000000)}`;
  let verifiedItems = [];
  let verifiedSubtotal = 0;
  let verifiedPackaging = 0;
  let verifiedDeliveryFee = 0;
  let verifiedDiscountCode = null;
  let verifiedDiscountAmount = 0;
  let verifiedTotal = 0;

  const connection = await pool.getConnection();
  try {
    const pricing = await computeAuthoritativePricing(connection, items, serviceType, deliveryZone);
    if (pricing.error) {
      return res.status(400).json({ error: pricing.error });
    }
    verifiedItems = pricing.verifiedItems;
    verifiedSubtotal = pricing.verifiedSubtotal;
    verifiedPackaging = pricing.verifiedPackaging;
    verifiedDeliveryFee = pricing.verifiedDeliveryFee;

    let inserted = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      await connection.beginTransaction();
      try {
        verifiedDiscountCode = null;
        verifiedDiscountAmount = 0;

        if (discountCode && String(discountCode).trim() !== '') {
          const promoResult = await evaluateVoucherOrPromo(connection, discountCode, verifiedSubtotal);
          if (!promoResult.valid) {
            await connection.rollback();
            return res.status(400).json({ error: promoResult.error });
          }

          if (promoResult.source === 'db' && promoResult.voucherId) {
            const [redeemResult] = await connection.query(
              `UPDATE vouchers
               SET used_at = NOW(), used_by_email = ?, used_order_id = ?
               WHERE id = ?
                 AND is_active = 1
                 AND (expires_at IS NULL OR expires_at > NOW())
                 AND (is_one_time = 0 OR used_at IS NULL)`,
              [normalizedCustomerEmail, finalOrderId, promoResult.voucherId]
            );

            if (redeemResult.affectedRows === 0) {
              await connection.rollback();
              return res.status(400).json({ error: `Voucher "${promoResult.code}" has already been redeemed or is no longer valid.` });
            }
          }

          verifiedDiscountCode = promoResult.code;
          verifiedDiscountAmount = promoResult.discountAmount;
        }

        verifiedTotal = Number((Math.max(0, verifiedSubtotal - verifiedDiscountAmount) + verifiedPackaging + verifiedDeliveryFee).toFixed(2));

        const serializedItems = JSON.stringify(verifiedItems);
        await connection.query(
          `INSERT INTO orders (id, items, packagingFee, deliveryFee, discountCode, discountAmount, subtotal, total, serviceType, customer_name, customer_email, customer_phone, customer_address, preferredTime, notes, status, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            finalOrderId,
            serializedItems,
            verifiedPackaging,
            verifiedDeliveryFee,
            verifiedDiscountCode,
            verifiedDiscountAmount,
            verifiedSubtotal,
            verifiedTotal,
            serviceType,
            String(customerInfo.name).trim(),
            normalizedCustomerEmail,
            String(customerInfo.phone).trim(),
            customerInfo.address || null,
            customerInfo.preferredTime || 'ASAP',
            customerInfo.notes || null,
            safeStatus,
            safeCreatedAt
          ]
        );

        await connection.commit();
        inserted = true;
        break;
      } catch (err) {
        try {
          await connection.rollback();
        } catch {
          // Ignore rollback error
        }
        if (err.code === 'ER_DUP_ENTRY') {
          finalOrderId = `CO-${crypto.randomInt(100000, 1000000)}`;
          continue;
        }
        throw err;
      }
    }

    if (!inserted) {
      return res.status(500).json({ error: 'Could not generate a unique order ID. Please try again.' });
    }
  } catch (error) {
    console.error('Error inserting order:', error);
    return res.status(500).json({ error: 'Database save failed' });
  } finally {
    connection.release();
  }

  updateOrdersLastUpdated();

  // Dispatch kitchen notification emails after commit
  try {
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
      for (const item of verifiedItems) {
        const itemPrice = item.price || 0;
        let modifiersHtml = '';
        if (item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
          modifiersHtml = '<div style="margin-top: 4px; padding: 4px 6px; background: #faf8f5; border-left: 2px solid #C85A32; font-size: 11px;">';
          for (const mod of item.modifiers) {
            const mQty = mod.quantity || 1;
            const isFree = !mod.price || mod.price === 0;
            const mPriceText = isFree ? '<span style="color: #059669; font-weight: bold;">[FREE]</span>' : `<span style="color: #b45309; font-weight: bold;">[+&euro;${((mod.price || 0) * mQty).toFixed(2)}]</span>`;
            const mQtyText = mQty > 1 ? `<strong>${mQty}x </strong>` : '';
            const mGroup = mod.groupTitle ? `<span style="color: #666;">${escapeHtml(String(mod.groupTitle))}: </span>` : '';
            modifiersHtml += `<div style="margin-bottom: 2px;">• ${mGroup}${mQtyText}${escapeHtml(String(mod.optionName || ''))} ${mPriceText}</div>`;
          }
          modifiersHtml += '</div>';
        }
        itemsHtml += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">
              <strong>${escapeHtml(String(item.name || ''))}</strong>
              ${modifiersHtml}
              ${item.notes ? `<div style="font-size: 11px; color: #C85A32; font-style: italic; margin-top: 3px;">Note: ${escapeHtml(String(item.notes))}</div>` : ''}
            </td>
            <td style="padding: 8px;">${escapeHtml(String(item.size || 'Standard'))}</td>
            <td style="padding: 8px; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; text-align: right;">&euro;${(itemPrice * item.quantity).toFixed(2)}</td>
          </tr>
        `;
      }
      itemsHtml += `</tbody></table>`;

      const mailSender = await getMailSender();
      const mailOptions = {
        from: `"The Royal Clay Oven Orders" <${mailSender}>`,
        to: recipientEmails.join(', '),
        subject: `🚨 New ${serviceType.toUpperCase()} Order #${finalOrderId} - €${verifiedTotal.toFixed(2)}`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; max-width: 650px; margin: auto; border: 1px solid #C85A32; background-color: #ffffff;">
            <div style="background-color: #2C2621; color: #FDFBF7; padding: 16px; text-align: center;">
              <h2 style="margin: 0; font-family: serif; letter-spacing: 0.1em; color: #C85A32;">THE ROYAL CLAY OVEN</h2>
              <p style="margin: 4px 0 0 0; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;">NEW KITCHEN ORDER ALERT</p>
            </div>
            
            <div style="padding: 16px; background-color: #FDFBF7; border-bottom: 1px solid #eee; margin-top: 15px;">
              <table style="width: 100%; font-size: 13px; color: #333;">
                <tr>
                  <td style="padding: 4px 0;"><strong>Order Ref:</strong></td>
                  <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #C85A32;">#${escapeHtml(finalOrderId)}</td>
                  <td style="padding: 4px 0;"><strong>Service:</strong></td>
                  <td style="padding: 4px 0; text-transform: uppercase; font-weight: bold;">${escapeHtml(serviceType)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;"><strong>Customer:</strong></td>
                  <td style="padding: 4px 0;">${escapeHtml(String(customerInfo.name))}</td>
                  <td style="padding: 4px 0;"><strong>Phone:</strong></td>
                  <td style="padding: 4px 0; font-family: monospace;">${escapeHtml(String(customerInfo.phone))}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;"><strong>Email:</strong></td>
                  <td style="padding: 4px 0;">${escapeHtml(normalizedCustomerEmail)}</td>
                  <td style="padding: 4px 0;"><strong>Time:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #C85A32;">${escapeHtml(String(customerInfo.preferredTime || 'ASAP'))}</td>
                </tr>
                ${customerInfo.address ? `
                <tr>
                  <td style="padding: 4px 0; vertical-align: top;"><strong>Delivery Address:</strong></td>
                  <td colspan="3" style="padding: 4px 0;">${escapeHtml(String(customerInfo.address))}</td>
                </tr>` : ''}
                ${customerInfo.notes ? `
                <tr>
                  <td style="padding: 4px 0; vertical-align: top;"><strong>Order Notes:</strong></td>
                  <td colspan="3" style="padding: 4px 0; color: #C85A32; font-style: italic;">"${escapeHtml(String(customerInfo.notes))}"</td>
                </tr>` : ''}
              </table>
            </div>

            <h3 style="font-family: serif; color: #2C2621; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 6px;">Order Item Breakdown</h3>
            ${itemsHtml}

            <table style="width: 100%; margin-top: 15px; font-family: monospace; font-size: 13px;">
              <tr>
                <td style="padding: 6px 8px; text-align: right; color: #666;">Subtotal:</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: bold; width: 100px;">&euro;${verifiedSubtotal.toFixed(2)}</td>
              </tr>
              ${verifiedDiscountAmount > 0 ? `
              <tr>
                <td style="padding: 6px 8px; text-align: right; color: #15803d; font-weight: bold;">Discount (${escapeHtml(verifiedDiscountCode)}):</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #15803d;">-&euro;${verifiedDiscountAmount.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 8px; text-align: right; color: #666;">Takeaway Packaging:</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: bold;">&euro;${verifiedPackaging.toFixed(2)}</td>
              </tr>
              ${verifiedDeliveryFee > 0 ? `
              <tr>
                <td style="padding: 6px 8px; text-align: right; color: #666;">Delivery Charge:</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: bold;">&euro;${verifiedDeliveryFee.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr style="font-size: 15px; background: #FDFBF7; border-top: 1px dashed #2C2621;">
                <td style="padding: 8px; text-align: right; font-weight: bold; color: #C85A32;">GRAND TOTAL:</td>
                <td style="padding: 8px; text-align: right; font-weight: bold; color: #C85A32; font-size: 16px;">&euro;${verifiedTotal.toFixed(2)}</td>
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
        console.log(`Notification emails successfully sent for order ${finalOrderId} to: ${recipientEmails.join(', ')}`);
      } catch (mailErr) {
        console.error('Failed to send order notification emails:', mailErr);
      }
    }
  } catch (mailSetupErr) {
    console.error('Order saved, but email notification setup failed:', mailSetupErr);
  }

  res.status(201).json({
    success: true,
    orderId: finalOrderId,
    subtotal: verifiedSubtotal,
    packagingFee: verifiedPackaging,
    deliveryFee: verifiedDeliveryFee,
    discountCode: verifiedDiscountCode || undefined,
    discountAmount: verifiedDiscountAmount,
    total: verifiedTotal,
    status: safeStatus,
  });
});

router.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const actor = getAuthActor(req);
  if (!actor) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const [existingRows] = await pool.query('SELECT customer_email FROM orders WHERE id = ? LIMIT 1', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (actor.role !== 'admin' && String(existingRows[0].customer_email || '').trim().toLowerCase() !== actor.email) {
      return res.status(403).json({ error: 'You can only archive your own orders' });
    }

    await pool.query('UPDATE orders SET is_archived = 1 WHERE id = ?', [id]);
    updateOrdersLastUpdated();
    res.json({ success: true, message: 'Order receipt log soft deleted' });
  } catch (error) {
    console.error('Error archiving order:', error);
    res.status(500).json({ error: 'Database archiving failed' });
  }
});

export default router;
