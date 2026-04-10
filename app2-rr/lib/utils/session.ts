export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  parentId: string | null;
  designation?: string | null;
  domain?: string | null;
  photoUrl?: string | null;
  districtId?: string | null;
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem('rr_user');
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('rr_token');
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('rr_token');
  localStorage.removeItem('rr_user');
}