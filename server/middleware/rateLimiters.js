import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

const isDev = process.env.NODE_ENV !== 'production';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 50,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' }
});

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 20,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please try again after 15 minutes.' }
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 10,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Please request a new code after 15 minutes.' }
});

export const voucherValidateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 30,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { valid: false, error: 'Too many voucher checks. Please try again in a few minutes.' }
});

export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 1000 : 50,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order submissions. Please try again later.' }
});

export const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isDev ? 5000 : 1200,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false
});
