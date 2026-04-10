export async function apiFetch(input: string, init: RequestInit = {}) {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('matrix_token')
      : null;

  const headers = new Headers(init.headers || {});

  if (token && token !== 'undefined' && token !== 'null') {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });
}