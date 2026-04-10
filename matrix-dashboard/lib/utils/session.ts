// lib/utils/session.ts
// Utilities for reading session data from localStorage

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  districtId: string | null;
  district?: { id: string; name: string; code: string } | null;
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('matrix_user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('matrix_token');
  if (!token || token === 'undefined' || token === 'null') return null;
  return token;
}

export function clearSession() {
  localStorage.removeItem('matrix_token');
  localStorage.removeItem('matrix_user');
}

export function requireSession(): SessionUser | null {
  const token = getSessionToken();
  const user  = getSessionUser();
  if (!token || !user) {
    window.location.href = '/login';
    return null;
  }
  return user;
}
