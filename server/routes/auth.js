import express from 'express';
import crypto from 'crypto';
import pool from '../db/pool.js';
import bcrypt from 'bcryptjs';
import { getMailSender, getTransporter } from '../utils/email.js';
import { authLimiter, otpLimiter, otpVerifyLimiter } from '../middleware/rateLimiters.js';
import { signAdminToken, signUserToken } from '../middleware/requireAdmin.js';

const router = express.Router();

const EXPECTED_GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  '1002488832719-mkmp4n48l15f0rbsqdec95phfj6h7apm.apps.googleusercontent.com';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resetOtpFailedAttempts = new Map();
const MAX_OTP_ATTEMPTS = 5;

router.post('/api/auth/google', authLimiter, async (req, res) => {
  const { idToken, accessToken } = req.body || {};
  if (!idToken && !accessToken) {
    return res.status(400).json({ error: 'Google token is required' });
  }

  try {
    let googleEmail = null;
    let googleName = null;
    let googlePicture = null;

    if (idToken) {
      const tokenRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(String(idToken))}`
      );
      if (!tokenRes.ok) {
        return res.status(401).json({ error: 'Invalid Google ID token' });
      }
      const tokenData = await tokenRes.json();
      const emailVerified = tokenData.email_verified === true || tokenData.email_verified === 'true';
      if (tokenData.aud !== EXPECTED_GOOGLE_CLIENT_ID || !emailVerified || !tokenData.email) {
        return res.status(401).json({ error: 'Google token verification failed' });
      }
      googleEmail = String(tokenData.email).trim().toLowerCase();
      googleName = tokenData.name || googleEmail.split('@')[0];
      googlePicture = tokenData.picture || null;
    } else if (accessToken) {
      const [tokenInfoRes, userInfoRes] = await Promise.all([
        fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(String(accessToken))}`),
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${String(accessToken)}` }
        })
      ]);

      if (!tokenInfoRes.ok || !userInfoRes.ok) {
        return res.status(401).json({ error: 'Invalid Google access token' });
      }

      const [tokenInfo, userInfo] = await Promise.all([tokenInfoRes.json(), userInfoRes.json()]);
      const audMatches =
        tokenInfo.aud === EXPECTED_GOOGLE_CLIENT_ID ||
        tokenInfo.azp === EXPECTED_GOOGLE_CLIENT_ID ||
        tokenInfo.issued_to === EXPECTED_GOOGLE_CLIENT_ID;
      const emailVerified = userInfo.email_verified === true || userInfo.email_verified === 'true';

      if (!audMatches || !emailVerified || !userInfo.email) {
        return res.status(401).json({ error: 'Google account verification failed' });
      }

      googleEmail = String(userInfo.email).trim().toLowerCase();
      googleName = userInfo.name || googleEmail.split('@')[0];
      googlePicture = userInfo.picture || null;
    }

    await pool.query(
      `INSERT INTO users (email, name, picture)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = COALESCE(NULLIF(VALUES(name), ''), name),
         picture = COALESCE(VALUES(picture), picture)`,
      [googleEmail, googleName, googlePicture]
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [googleEmail]);
    const userObj = rows.length > 0 ? { ...rows[0] } : { email: googleEmail, name: googleName, picture: googlePicture };
    delete userObj.password;

    userObj.userToken = signUserToken(googleEmail);

    const [adminRows] = await pool.query('SELECT email FROM admin_emails WHERE LOWER(email) = ? LIMIT 1', [googleEmail]);
    if (adminRows.length > 0) {
      userObj.adminToken = signAdminToken(googleEmail);
      console.log(`Verified Google admin session granted for: ${googleEmail}`);
    }

    res.json(userObj);
  } catch (error) {
    console.error('Google authentication verification failed:', error);
    res.status(500).json({ error: 'Failed to verify Google authentication' });
  }
});

router.post('/api/auth/register', authLimiter, async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const [existing] = await pool.query('SELECT email FROM users WHERE LOWER(email) = ? LIMIT 1', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
      [normalizedEmail, String(name).trim(), hashedPassword]
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [normalizedEmail]);
    if (rows.length > 0) {
      const userObj = { ...rows[0] };
      delete userObj.password;
      userObj.userToken = signUserToken(normalizedEmail);
      return res.json(userObj);
    }
    res.status(500).json({ error: 'Registration failed' });
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

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
      [normalizedEmail]
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
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, user.email]);
      }
    }

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid email or password credentials' });
    }

    const userObj = { ...user };
    delete userObj.password;
    userObj.userToken = signUserToken(user.email);
    res.json(userObj);
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

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const [users] = await pool.query('SELECT email FROM users WHERE LOWER(email) = ? LIMIT 1', [normalizedEmail]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'No account registered with this email address' });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query(
      `INSERT INTO password_reset_otps (email, otp, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
      [normalizedEmail, hashedOtp, expiresAt]
    );
    resetOtpFailedAttempts.delete(normalizedEmail);

    const mailSender = await getMailSender();
    const mailOptions = {
      from: `"The Royal Clay Oven" <${mailSender}>`,
      to: normalizedEmail,
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
          <p style="font-size: 13px; color: #888; text-align: left;">★ <strong>Important Details:</strong></p>
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
    console.log(`Successfully dispatched password reset OTP to: ${normalizedEmail}`);
    res.json({ success: true, message: 'OTP verification code has been dispatched to your email.' });
  } catch (error) {
    console.error('Forgot password endpoint error:', error);
    res.status(500).json({ error: 'Failed to generate or send OTP passcode. Please check email details.' });
  }
});

router.post('/api/auth/reset-password', otpVerifyLimiter, async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const [rows] = await pool.query(
      'SELECT * FROM password_reset_otps WHERE LOWER(email) = ? LIMIT 1',
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No active OTP verification code found for this email' });
    }

    const record = rows[0];
    const expiresAt = new Date(record.expires_at);
    const trimmedOtp = String(otp).trim();
    const hashedInput = crypto.createHash('sha256').update(trimmedOtp).digest('hex');

    if (expiresAt.getTime() < Date.now()) {
      await pool.query('DELETE FROM password_reset_otps WHERE LOWER(email) = ?', [normalizedEmail]);
      resetOtpFailedAttempts.delete(normalizedEmail);
      return res.status(400).json({ error: 'OTP passcode has expired (valid for 15 minutes). Please resend code.' });
    }

    if (record.otp !== hashedInput && record.otp !== trimmedOtp) {
      const attempts = (resetOtpFailedAttempts.get(normalizedEmail) || 0) + 1;
      if (attempts >= MAX_OTP_ATTEMPTS) {
        await pool.query('DELETE FROM password_reset_otps WHERE LOWER(email) = ?', [normalizedEmail]);
        resetOtpFailedAttempts.delete(normalizedEmail);
        return res.status(429).json({ error: 'Too many incorrect OTP attempts. Code invalidated; please request a new one.' });
      }
      resetOtpFailedAttempts.set(normalizedEmail, attempts);
      return res.status(400).json({ error: 'Incorrect OTP passcode entered. Please verify code.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password = ? WHERE LOWER(email) = ?',
      [hashedNewPassword, normalizedEmail]
    );

    await pool.query(
      'DELETE FROM password_reset_otps WHERE LOWER(email) = ?',
      [normalizedEmail]
    );
    resetOtpFailedAttempts.delete(normalizedEmail);

    res.json({ success: true, message: 'Password has been updated successfully! Please log in.' });
  } catch (error) {
    console.error('Reset password endpoint error:', error);
    res.status(500).json({ error: 'Failed to update credentials. Database query error.' });
  }
});

export default router;
