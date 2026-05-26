/**
 * Smoke tests for the auth context.
 *
 * Covers the lifecycle that the rest of the app relies on:
 *   - Initial state: user=null, ready=false → ready=true after mount
 *   - Loads existing token+email from localStorage on mount
 *   - login() persists to localStorage AND updates context state
 *   - logout() clears both
 *   - Corrupt JWT clears storage instead of crashing
 *
 * `jwt-decode` is mocked so we can drive payloads without crafting real JWTs.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("jwt-decode", () => ({
  jwtDecode: vi.fn((token: string) => {
    if (token === "valid-token") {
      return { sub: "user-1", org: "org-1", role: "admin" };
    }
    throw new Error("invalid token");
  }),
}));

import { AuthProvider, useAuth } from "./auth-context";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("useAuth", () => {
  it("starts unauthenticated and flips to ready after mount", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("loads user from localStorage when token+email exist", async () => {
    window.localStorage.setItem("saas_doc_token", "valid-token");
    window.localStorage.setItem("saas_doc_email", "test@cabinet.fr");

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({
      userId: "user-1",
      email: "test@cabinet.fr",
      orgId: "org-1",
      role: "admin",
    });
  });

  it("login() persists to localStorage and updates user state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.login("valid-token", "new@cabinet.fr");
    });

    expect(window.localStorage.getItem("saas_doc_token")).toBe("valid-token");
    expect(window.localStorage.getItem("saas_doc_email")).toBe(
      "new@cabinet.fr",
    );
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("new@cabinet.fr");
    expect(result.current.user?.orgId).toBe("org-1");
    expect(result.current.user?.role).toBe("admin");
  });

  it("logout() clears localStorage and resets user", async () => {
    window.localStorage.setItem("saas_doc_token", "valid-token");
    window.localStorage.setItem("saas_doc_email", "test@cabinet.fr");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(window.localStorage.getItem("saas_doc_token")).toBeNull();
    expect(window.localStorage.getItem("saas_doc_email")).toBeNull();
  });

  it("clears storage when the stored JWT cannot be decoded", async () => {
    window.localStorage.setItem("saas_doc_token", "corrupt-token");
    window.localStorage.setItem("saas_doc_email", "test@cabinet.fr");

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.user).toBeNull();
    expect(window.localStorage.getItem("saas_doc_token")).toBeNull();
    expect(window.localStorage.getItem("saas_doc_email")).toBeNull();
  });
});
