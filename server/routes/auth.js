import express from 'express';
import pool from '../db/pool.js';
import bcrypt from 'bcryptjs';
import { getMailSender, getTransporter } from '../utils/email.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.post('/api/auth/register', authLimiter, async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
      [email, name, hashedPassword]
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      delete rows[0].password;
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Database signup error' });
  }
});

router.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    if (!user.password) {
      return res.status(400).json({ error: 'This account was authenticated via Google. Please log in with Google.' });
    }

    let isValidPassword = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      isValidPassword = (user.password === password);
      if (isValidPassword) {
        const hashedPassword = await bcrypt.hash(password, 12);
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
      }
    }

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid email or password credentials' });
    }

    if (rows.length > 0) {
      delete rows[0].password;
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Database login query error' });
  }
});

router.post('/api/auth/forgot-password', otpLimiter, async (req, res) => {
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

    const mailSender = await getMailSender();
    const mailOptions = {
      from: `"The Royal Clay Oven" <${mailSender}>`,
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
          <p style="font-size: 11px; color: #999;">The Royal Clay Oven &bull; Ballycasey, Shannon, Co. Clare &bull; accounts@clayoven.ie</p>
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

router.post('/api/auth/reset-password', async (req, res) => {
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

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedNewPassword, email]
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

export default router;
