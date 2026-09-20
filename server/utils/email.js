import nodemailer from 'nodemailer';
import pool from '../db/pool.js';
import {
  smtpConfigCache, smtpConfigCacheTime, SMTP_CACHE_TTL, setSmtpConfigCache,
  notifEmailsCache, notifEmailsCacheTime, NOTIF_EMAILS_CACHE_TTL, setNotifEmailsCache
} from '../cache/index.js';

export async function getSmtpConfig() {
  const now = Date.now();
  if (smtpConfigCache && (now - smtpConfigCacheTime) < SMTP_CACHE_TTL) {
    return smtpConfigCache;
  }
  try {
    const [rows] = await pool.query('SELECT * FROM smtp_settings LIMIT 1');
    if (rows.length > 0) {
      setSmtpConfigCache(rows[0], now);
      return rows[0];
    }
  } catch (err) {
    console.error('Failed to retrieve SMTP settings from database, using env fallback', err);
  }
  return null;
}

export async function getOrderNotificationEmails() {
  const now = Date.now();
  if (notifEmailsCache && (now - notifEmailsCacheTime) < NOTIF_EMAILS_CACHE_TTL) {
    return notifEmailsCache;
  }
  try {
    const [rows] = await pool.query('SELECT email FROM order_notification_emails');
    const emails = rows.map(r => r.email);
    setNotifEmailsCache(emails, now);
    return emails;
  } catch (err) {
    console.error('Failed to retrieve notification emails from database', err);
    const fallback = process.env.NOTIFICATION_FALLBACK_EMAILS || '';
    return fallback.split(',').map(e => e.trim()).filter(Boolean);
  }
}

export async function getTransporter() {
  const config = await getSmtpConfig();
  if (config) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure === 'true' || config.secure === true,
      auth: {
        user: config.user,
        pass: config.password,
      }
    });
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  });
}

export async function getMailSender() {
  const config = await getSmtpConfig();
  if (config && config.user) {
    return config.user;
  }
  return process.env.SMTP_USER || '';
}

export const escapeHtml = (str) => str?.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g, '&#39;') || '';
