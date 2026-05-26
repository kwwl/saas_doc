/**
 * Smoke tests for the API client wrapper.
 *
 * Covers the contracts that matter end-to-end:
 *   - JSON parsing on 200
 *   - Authorization header attached when a token is present
 *   - 204 No Content returns undefined (no parse attempt)
 *   - Backend `detail` surfaced through ApiError
 *   - 401 on protected paths clears auth + redirects to /login
 *   - 401 on /auth/* paths does NOT redirect (the form handles it)
 *
 * The `./auth` module is mocked so we can drive `getToken` / `clearAuth`
 * independently of localStorage state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  getToken: vi.fn<() => string | null>(() => null),
  clearAuth: vi.fn<() => void>(),
}));

import { api, ApiError } from "./api";
import * as auth from "./auth";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  // jsdom's window.location is read-only; redefine as a plain mutable object.
  Object.defineProperty(window, "location", {
    value: { href: "" },
    writable: true,
  });
  vi.mocked(auth.getToken).mockReturnValue(null);
  vi.mocked(auth.clearAuth).mockClear();
});

afterEach(() => {
  fetchMock.mockReset();
});

describe("api wrapper", () => {
  it("returns parsed JSON for 200 responses", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "abc", name: "Acme" }),
    });

    const res = await api.get<{ id: string; name: string }>("/clients/abc");

    expect(res).toEqual({ id: "abc", name: "Acme" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("attaches Authorization: Bearer <token> when a token exists", async () => {
    vi.mocked(auth.getToken).mockReturnValue("jwt-xyz");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await api.get("/dashboard");

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer jwt-xyz");
  });

  it("sends Content-Type: application/json for POST with body", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: "1" }),
    });

    await api.post("/clients", { name: "Acme" });

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ name: "Acme" }));
  });

  it("returns undefined for 204 No Content without parsing", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      // json() intentionally absent — should not be called
    });

    const res = await api.delete<void>("/clients/abc");
    expect(res).toBeUndefined();
  });

  it("surfaces backend detail through ApiError", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ detail: "Email déjà utilisé" }),
    });

    await expect(api.post("/auth/register", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Email déjà utilisé",
    });
  });

  it("clears auth and redirects to /login on 401 from a protected route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ detail: "Token expired" }),
    });

    await expect(api.get("/clients")).rejects.toBeInstanceOf(ApiError);

    expect(auth.clearAuth).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe("/login");
  });

  it("does NOT redirect on 401 from /auth/* (login form surfaces it inline)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ detail: "Invalid credentials" }),
    });

    await expect(api.post("/auth/login", {})).rejects.toBeInstanceOf(ApiError);

    expect(auth.clearAuth).not.toHaveBeenCalled();
    expect(window.location.href).toBe("");
  });
});
