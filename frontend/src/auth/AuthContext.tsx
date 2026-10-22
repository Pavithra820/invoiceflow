import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import * as api from "../api/client";
import type { User } from "../api/types";

const TOKEN_KEY = "invoiceflow_token";

export interface AuthState {
  user: User | null;
  loading: boolean;
  canCreate: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    api.setAuthToken(null);
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // When the server says the token is no longer valid (expired, user disabled), sign out.
  useEffect(() => {
    api.setUnauthorizedHandler(logout);
    return () => api.setUnauthorizedHandler(null);
  }, [logout]);

  // Restore the session after a page refresh.
  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (!saved) {
      setLoading(false);
      return;
    }
    api.setAuthToken(saved);
    api
      .getMe()
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await api.login(email, password);
    api.setAuthToken(access_token);
    sessionStorage.setItem(TOKEN_KEY, access_token);
    setUser(await api.getMe());
  }, []);

  const register = useCallback(
    async (email: string, password: string) => {
      await api.register(email, password);
      await login(email, password);
    },
    [login],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      canCreate: user?.role === "admin" || user?.role === "reviewer",
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
