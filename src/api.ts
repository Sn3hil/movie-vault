const TOKEN_KEY = 'mv_token';
const USER_KEY = 'movievault_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function setUsername(name: string) {
  localStorage.setItem(USER_KEY, name);
}

export function getUsername(): string | null {
  return localStorage.getItem(USER_KEY);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function shouldIgnoreAuth(url: string): boolean {
  return url.startsWith('/api/auth/');
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token && !shouldIgnoreAuth(url)) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && !shouldIgnoreAuth(url)) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
}
