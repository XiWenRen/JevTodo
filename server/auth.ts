import crypto from 'crypto';

const DEFAULT_AUTH_SECRET = 'jev_app_auth_secret_stable_production_key_2026';
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || DEFAULT_AUTH_SECRET;

if (!process.env.AUTH_SECRET && !process.env.JWT_SECRET) {
  console.warn('[AUTH] Warning: AUTH_SECRET / JWT_SECRET not configured in environment variables. Using default key fallback.');
}

export interface UserPayload {
  uid: string;
  username: string;
  exp: number;
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const finalSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, finalSalt, 64).toString('hex');
  return { hash, salt: finalSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const calculatedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch (err) {
    return false;
  }
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf-8');
}

export function signToken(user: { id: string; username: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: UserPayload = {
    uid: user.id,
    username: user.username,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

export function verifyToken(token: string): UserPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const actualSigBuf = Buffer.from(signature);
  const expectedSigBuf = Buffer.from(expectedSignature);

  if (actualSigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(actualSigBuf, expectedSigBuf)) {
    return null;
  }

  try {
    const payloadJson = base64UrlDecode(encodedPayload);
    const payload: UserPayload = JSON.parse(payloadJson);
    if (!payload.uid || !payload.exp || Date.now() > payload.exp) {
      return null; // Expired or invalid
    }
    return payload;
  } catch (err) {
    return null;
  }
}

export function extractUserIdFromReq(req: any): string | null {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  const payload = verifyToken(token);
  return payload ? payload.uid : null;
}
