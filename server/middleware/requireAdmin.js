import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.ADMIN_JWT_SECRET) {
  console.warn('⚠️  WARNING: ADMIN_JWT_SECRET not set in .env — using insecure random fallback. Admin sessions will not survive server restarts!');
}
export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || crypto.randomBytes(32).toString('hex');
export const USER_JWT_SECRET = process.env.USER_JWT_SECRET || crypto.createHash('sha256').update(`user:${ADMIN_JWT_SECRET}`).digest('hex');

export function signAdminToken(email) {
  return jwt.sign(
    { email: String(email).toLowerCase().trim(), role: 'admin' },
    ADMIN_JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function signUserToken(email) {
  return jwt.sign(
    { email: String(email).toLowerCase().trim(), role: 'user' },
    USER_JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Extracts verified caller identity ({ role: 'admin' | 'user', email }) from Authorization header.
 * Returns null if missing or invalid.
 */
export function getAuthActor(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded && decoded.role === 'admin' && decoded.email) {
      return { role: 'admin', email: String(decoded.email).toLowerCase().trim() };
    }
  } catch {
    // Not a valid admin token; try user token below
  }

  try {
    const decoded = jwt.verify(token, USER_JWT_SECRET);
    if (decoded && decoded.role === 'user' && decoded.email) {
      return { role: 'user', email: String(decoded.email).toLowerCase().trim() };
    }
  } catch {
    // Invalid token
  }

  return null;
}

export const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — admin authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized — admin privileges required' });
    }
    req.adminEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized — session expired or invalid token' });
  }
};
