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

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
