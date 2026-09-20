import express from 'express';
import pool from '../db/pool.js';
import { getMailSender, getTransporter, escapeHtml } from '../utils/email.js';
import { orderLimiter } from '../middleware/rateLimiters.js';
import { bookingsLastUpdated, updateBookingsLastUpdated } from '../cache/index.js';

const router = express.Router();

router.get('/api/bookings', async (req, res) => {
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

router.post('/api/bookings', orderLimiter, async (req, res) => {
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

    updateBookingsLastUpdated();
    res.status(201).json({ success: true, bookingId: id });
  } catch (error) {
    console.error('Error inserting booking or sending acknowledgement email:', error);
    updateBookingsLastUpdated();
    res.status(201).json({ success: true, bookingId: id });
  }
});

router.put('/api/bookings/:id/status', async (req, res) => {
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

    updateBookingsLastUpdated();

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

export default router;
