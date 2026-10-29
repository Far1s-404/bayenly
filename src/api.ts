export const API_BASE = (import.meta as ImportMeta & { env: { VITE_API_BASE?: string } }).env.VITE_API_BASE || '/api';

export type AuthUser = {
  id: number | string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type PurchaseRecord = {
  purchase_id: number;
  package_id: number;
  title: string;
  description?: string | null;
  subject: string;
  language?: string;
  teacher_name: string;
  video_count: number;
  amount: string | number;
  status: 'pending' | 'paid' | string;
  purchased_at?: string | null;
};

const SESSION_KEY = 'bayyenly.auth.v1';
const TOKEN_KEY = 'bayenly_token';
const USER_KEY = 'bayenly_user';

export function readAuthSession(): AuthSession | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    if (token && user) {
      return { token, user: JSON.parse(user) as AuthUser };
    }

    const legacy = sessionStorage.getItem(SESSION_KEY);
    if (!legacy) return null;
    const session = JSON.parse(legacy) as AuthSession;
    return session?.token && session?.user ? session : null;
  } catch {
    return null;
  }
}

export function readAuthToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) return token;
    const legacy = sessionStorage.getItem(SESSION_KEY);
    if (!legacy) return null;
    const session = JSON.parse(legacy) as AuthSession;
    return session?.token || null;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('bayyenly:auth-changed'));
}

export function saveAuthUser(user: AuthUser): void {
  if (!readAuthToken()) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } finally {
    window.dispatchEvent(new Event('bayyenly:auth-changed'));
    window.dispatchEvent(new Event('bayyenly:session-expired'));
  }
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401 && readAuthToken()) {
    clearAuthSession();
  }
  return response;
}

export class ApiError extends Error {
  readonly status: number;
  readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type ApiOptions = RequestInit & { token?: string | null };

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token: explicitToken, headers: suppliedHeaders, ...requestOptions } = options;
  const token = explicitToken === undefined ? readAuthToken() : explicitToken;
  const headers = new Headers(suppliedHeaders);
  if (requestOptions.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...requestOptions, headers });
  } catch {
    throw new ApiError('Unable to reach Bayyenly. Check that the API server is running.', 0);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token) clearAuthSession();
    const message = data && typeof data.message === 'string' ? data.message : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}
