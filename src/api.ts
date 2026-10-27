export const API_BASE = (import.meta as ImportMeta & { env: { VITE_API_BASE?: string } }).env.VITE_API_BASE || 'http://localhost:3000/api';

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

export function readAuthSession(): AuthSession | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as AuthSession;
    return session?.token && session?.user ? session : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } finally {
    window.dispatchEvent(new Event('bayyenly:session-expired'));
  }
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
  const token = explicitToken === undefined ? readAuthSession()?.token : explicitToken;
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
