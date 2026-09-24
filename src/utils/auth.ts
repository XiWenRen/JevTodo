export interface AuthUser {
  id: string;
  username: string;
}

const TOKEN_KEY = 'jev_auth_token_v1';
const USER_KEY = 'jev_current_user_v1';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: AuthUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save auth to localStorage:', e);
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.warn('Failed to clear auth from localStorage:', e);
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseAuthResponse<T = any>(res: Response): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const data = await res.json();
      return { ok: res.ok, status: res.status, data, error: data?.error };
    } catch {
      return { ok: false, status: res.status, error: '服务器响应格式无法解析' };
    }
  }

  // Handle plain text or HTML (e.g. Vercel 500 error pages)
  try {
    const text = await res.text();
    if (res.status >= 500) {
      return { ok: false, status: res.status, error: '认证服务器正在初始化或暂时繁忙，请稍后重试' };
    }
    return { ok: false, status: res.status, error: text.slice(0, 100) || `请求失败 (${res.status})` };
  } catch {
    return { ok: false, status: res.status, error: `网络请求失败 (${res.status})` };
  }
}

export async function loginUser(username: string, password: string): Promise<{ success: boolean; user?: AuthUser; token?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username, password })
    });
    const parsed = await parseAuthResponse(res);
    if (!parsed.ok || !parsed.data) {
      return { success: false, error: parsed.error || '登录失败，请检查用户名或密码' };
    }
    const data = parsed.data;
    if (data.token && data.user) {
      setStoredAuth(data.token, data.user);
    }
    return { success: true, user: data.user, token: data.token };
  } catch (err: any) {
    return { success: false, error: err.message || '网络连接异常，请检查网络设置' };
  }
}

export async function registerUser(username: string, password: string): Promise<{ success: boolean; user?: AuthUser; token?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', username, password })
    });
    const parsed = await parseAuthResponse(res);
    if (!parsed.ok || !parsed.data) {
      return { success: false, error: parsed.error || '注册失败，请稍后重试' };
    }
    const data = parsed.data;
    if (data.token && data.user) {
      setStoredAuth(data.token, data.user);
    }
    return { success: true, user: data.user, token: data.token };
  } catch (err: any) {
    return { success: false, error: err.message || '网络连接异常，请检查网络设置' };
  }
}

export async function checkCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) {
      clearStoredAuth();
      return null;
    }
    if (!res.ok) {
      return getStoredUser();
    }
    const parsed = await parseAuthResponse(res);
    return parsed.data?.user || getStoredUser();
  } catch {
    // If offline, return locally cached user
    return getStoredUser();
  }
}
