const TOKEN_KEY = 'triple_agent_token';

export function generateToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getOrCreateToken(): string {
  if (typeof window === 'undefined') return '';
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) return existing;
  const token = generateToken();
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}
