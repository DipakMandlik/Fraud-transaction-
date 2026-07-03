import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { authApi } from "@/lib/api";

interface AuthUser {
  username: string;
  full_name: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("auth_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: async (username: string, password: string) => {
        const result = await authApi.login(username, password);
        localStorage.setItem("auth_token", result.token);
        const authUser = { username: result.username, full_name: result.full_name, role: result.role };
        localStorage.setItem("auth_user", JSON.stringify(authUser));
        setUser(authUser);
      },
      logout: () => {
        authApi.logout().catch(() => undefined);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
