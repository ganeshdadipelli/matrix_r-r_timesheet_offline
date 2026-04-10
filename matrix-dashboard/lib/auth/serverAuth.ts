import { cookies, headers } from 'next/headers';
import jwt from 'jsonwebtoken';

export type AppRole = 'FIELD_USER' | 'ADMIN' | 'SUPER_ADMIN';

export type AuthUser = {
  userId: string;
  email: string;
  role: AppRole;
  districtId?: string | null;
  name?: string;
};

const COOKIE_NAME = 'matrix_token';

const JWT_SECRETS = [
  process.env.JWT_SECRET,
  'matrix_secret',
  'matrix_secret_2026',
  'matrix_jwt_secret_2026',
  'your-super-secret-jwt-key-change-in-production',
].filter(Boolean) as string[];

function mapDecoded(decoded: any): AuthUser | null {
  if (!decoded || typeof decoded !== 'object') return null;

  const role = decoded.role || decoded.userRole;
  const email = decoded.email || '';
  const userId = decoded.userId || decoded.id || decoded.sub || '';
  const districtId = decoded.districtId ?? null;
  const name = decoded.name || '';

  if (!role || !email || !userId) return null;
  if (!['FIELD_USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) return null;

  return {
    userId,
    email,
    role,
    districtId,
    name,
  };
}

function verifyToken(token: string): AuthUser | null {
  for (const secret of JWT_SECRETS) {
    try {
      const decoded = jwt.verify(token, secret) as any;
      const user = mapDecoded(decoded);
      if (user) return user;
    } catch {}
  }

  return null;
}

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const headerStore = headers();
    const cookieStore = cookies();

    const authHeader =
      headerStore.get('authorization') ||
      headerStore.get('Authorization');

    const bearerToken = getBearerToken(authHeader);
    if (bearerToken) {
      const user = verifyToken(bearerToken);
      if (user) return user;
    }

    const cookieToken = cookieStore.get(COOKIE_NAME)?.value || null;
    if (cookieToken) {
      const user = verifyToken(cookieToken);
      if (user) return user;
    }

    return null;
  } catch {
    return null;
  }
}