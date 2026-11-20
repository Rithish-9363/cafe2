import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';

const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  return envSecret && envSecret.length >= 16 ? envSecret : EPHEMERAL_FALLBACK_SECRET;
}

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function safeCompareStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Perform constant-time comparison on same-length dummy buffers to avoid length leak
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

interface TokenPayload {
  sub: string;
  role: 'customer' | 'admin';
  exp: number;
}

export function signToken(userId: string, role: 'customer' | 'admin'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload: TokenPayload = {
    sub: userId,
    role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${payloadEncoded}`;
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payloadEncoded, sig] = parts;
    const data = `${header}.${payloadEncoded}`;
    const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(data).digest('base64url');
    if (!safeCompareStrings(sig, expectedSig)) return null;
    const decoded = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!decoded.sub || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function signDemoPaymentToken(amountCents: number): string {
  const nonce = crypto.randomBytes(10).toString('hex');
  const exp = Math.floor(Date.now() / 1000) + 60 * 15;
  const payload = Buffer.from(JSON.stringify({ amountCents, nonce, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(`demo:${payload}`).digest('base64url');
  return `demo_${payload}.${sig}`;
}

export function verifyDemoPaymentToken(token: string, expectedAmountCents: number): boolean {
  try {
    if (!token.startsWith('demo_')) return false;
    const raw = token.slice(5);
    const parts = raw.split('.');
    if (parts.length !== 2) return false;
    const [payload, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(`demo:${payload}`).digest('base64url');
    if (!safeCompareStrings(sig, expectedSig)) return false;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      amountCents: number;
      exp: number;
    };
    if (decoded.exp < Math.floor(Date.now() / 1000)) return false;
    return decoded.amountCents === expectedAmountCents;
  } catch {
    return false;
  }
}

function loadUserById(userId: string): AuthUser | null {
  const row = db
    .prepare('SELECT userId, name, email, phone, role FROM users WHERE userId = ?')
    .get(userId) as AuthUser | undefined;
  return row ?? null;
}

export function extractUser(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const payload = verifyToken(token);
    if (payload) {
      const user = loadUserById(payload.sub);
      if (user) {
        req.user = user;
      }
    }
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  extractUser(req, res, () => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
      return;
    }
    next();
  });
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Administrator privileges are required.' });
    return;
  }
  next();
}

export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && email.trim().length <= 160;
}

export function isValidPhone(phone: unknown): phone is string {
  return typeof phone === 'string' && /^[+\d\s().-]{7,24}$/.test(phone.trim());
}

export function isNonEmptyString(val: unknown, maxLen = 500): val is string {
  return typeof val === 'string' && val.trim().length > 0 && val.trim().length <= maxLen;
}

export function sanitizeImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return null;
  if (trimmed.startsWith('/src/assets/images/') || trimmed.startsWith('/api/uploads/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}
