/**
 * JWT storage in localStorage.
 *
 * V1 MVP choice: localStorage is simple and works without server-side cookies.
 * Tradeoff: tokens are exposed to JavaScript (XSS risk). For V2, swap to
 * httpOnly cookies set by a backend session endpoint.
 *
 * All functions guard against SSR (`window` undefined) — safe to call from
 * Server Components, Client Components, or shared modules.
 */

const TOKEN_KEY = "saas_doc_token";
const EMAIL_KEY = "saas_doc_email";

// --- Token ---

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

// --- Email (not in JWT, stored separately at login/register time) ---

export function getEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(EMAIL_KEY);
}

export function setEmail(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EMAIL_KEY, email);
}

export function clearEmail(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(EMAIL_KEY);
}

// --- Combined ---

/** Clear both token and email — used on logout or 401. */
export function clearAuth(): void {
  clearToken();
  clearEmail();
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
