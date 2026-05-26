"use client";

/**
 * Auth context — single source of truth for the current user's identity.
 *
 * On first client mount, reads token + email from localStorage and decodes the
 * JWT to extract org_id + role. `ready` flips to true once that initial read
 * is done — protected layouts should hold off rendering until then to avoid
 * the false "not authenticated" flash on hydration.
 *
 * `login(token, email)` and `logout()` mutate localStorage AND the context
 * state, so every consumer (header email, route guard, etc.) re-renders
 * together. Cross-tab sync is not implemented in V1 (acceptable tradeoff).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { jwtDecode } from "jwt-decode";
import {
  clearAuth as clearAuthStorage,
  getEmail,
  getToken,
  setEmail as setEmailStorage,
  setToken as setTokenStorage,
} from "./auth";

interface JwtPayload {
  sub: string; // user_id
  org: string; // organization_id
  role: string; // "admin" | "comptable"
  exp?: number; // expiration timestamp
}

export interface AuthUser {
  userId: string;
  email: string;
  orgId: string;
  role: string;
}

interface AuthContextValue {
  /** Current user, or null when unauthenticated. */
  user: AuthUser | null;
  /** False until the initial localStorage read has completed (first effect). */
  ready: boolean;
  isAuthenticated: boolean;
  login: (token: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeUser(token: string, email: string): AuthUser | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (!payload.sub || !payload.org || !payload.role) return null;
    return {
      userId: payload.sub,
      email,
      orgId: payload.org,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  // Initial load from localStorage on client mount.
  useEffect(() => {
    const token = getToken();
    const email = getEmail();
    if (token && email) {
      const decoded = decodeUser(token, email);
      if (decoded) {
        setUser(decoded);
      } else {
        // Corrupt token — clear it.
        clearAuthStorage();
      }
    }
    setReady(true);
  }, []);

  const login = useCallback((token: string, email: string) => {
    setTokenStorage(token);
    setEmailStorage(email);
    const decoded = decodeUser(token, email);
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
