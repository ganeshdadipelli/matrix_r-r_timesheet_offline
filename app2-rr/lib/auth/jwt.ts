import jwt, { SignOptions } from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'rr_jwt_secret_2026';
const EXPIRES_IN: SignOptions['expiresIn'] = '24h';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  parentId: string | null;
  designation?: string | null;
  domain?: string | null;
  districtId?: string | null;
}

export function createToken(payload: JWTPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SECRET) as JWTPayload;
  } catch {
    return null;
  }
}