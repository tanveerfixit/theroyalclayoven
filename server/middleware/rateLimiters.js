import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

const isDev = process.env.NODE_ENV !== 'production';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 50,
  skip: (req) => isDev || req.ip === '127.0.0.1' || req.ip === '::1',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' }
});

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 30,
  skip: (req) => isDev || req.ip === '127.0.0.1' || req.ip === '::1',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please try again after 15 minutes.' }
});

export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 1000 : 50,
  skip: (req) => isDev || req.ip === '127.0.0.1' || req.ip === '::1',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order submissions. Please try again later.' }
});

export const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isDev ? 5000 : 1200,
  skip: (req) => isDev || req.ip === '127.0.0.1' || req.ip === '::1',
  standardHeaders: true,
  legacyHeaders: false
});
