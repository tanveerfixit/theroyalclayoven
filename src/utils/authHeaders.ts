export const USER_TOKEN_KEY = 'clay_oven_user_token';
export const ADMIN_TOKEN_KEY = 'clay_oven_admin_token';

export function getUserToken(): string | null {
  return localStorage.getItem(USER_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setUserToken(token: string): void {
  localStorage.setItem(USER_TOKEN_KEY, token);
}

export function clearUserToken(): void {
  localStorage.removeItem(USER_TOKEN_KEY);
}

export function userAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getUserToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}
