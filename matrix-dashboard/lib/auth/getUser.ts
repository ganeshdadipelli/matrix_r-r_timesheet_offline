// lib/auth/getUser.ts
import { NextRequest } from 'next/server';
import { verifyToken, JWTPayload } from './jwt';

export function getUserFromRequest(req: NextRequest): JWTPayload | null {
  const cookie = req.cookies.get('matrix_token')?.value;
  if (!cookie) return null;
  return verifyToken(cookie);
}
