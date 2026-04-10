import { NextResponse } from 'next/server';
import { getAuthUser } from './serverAuth';
import type { JWTPayload } from './jwt';

type AuthUser = JWTPayload;
type AppRole = string;

export async function requireUser(): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse }
> {
  const user = await getAuthUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  return { ok: true, user };
}

export async function requireRoles(roles: AppRole[]): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  if (!roles.includes(auth.user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      ),
    };
  }

  return auth;
}