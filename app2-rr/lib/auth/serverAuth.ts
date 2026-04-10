import { cookies, headers } from 'next/headers';
import { verifyToken, type JWTPayload } from './jwt';

export function getAuthUser(): JWTPayload | null {
  try {
    const authHeader = headers().get('authorization') || '';

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const user = verifyToken(token);
      if (user) return user;
    }

    const cookieToken = cookies().get('rr_token')?.value;

    if (cookieToken) {
      const user = verifyToken(cookieToken);
      if (user) return user;
    }

    return null;
  } catch {
    return null;
  }
}