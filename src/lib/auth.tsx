import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setToken, getToken } from "./api";

type Role = "admin" | "security";
interface User { username: string; role: Role }
interface AuthCtx {
  user: User | null;
  mustChangePassword: boolean;
  login: (u: User, token: string, mustChangePassword?: boolean) => void;
  clearMustChangePassword: () => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  mustChangePassword: false,
  login: () => {},
  clearMustChangePassword: () => {},
  logout: () => {},
});

const MUST_KEY = "sas_must_change";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mustChangePassword, setMust] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("sas_user");
    if (raw && getToken()) {
      try { setUser(JSON.parse(raw)); } catch { /* noop */ }
      setMust(localStorage.getItem(MUST_KEY) === "1");
    }
  }, []);

  return (
    <Ctx.Provider value={{
      user,
      mustChangePassword,
      login: (u, token, must = false) => {
        setToken(token);
        localStorage.setItem("sas_user", JSON.stringify(u));
        if (must) localStorage.setItem(MUST_KEY, "1");
        else localStorage.removeItem(MUST_KEY);
        setUser(u);
        setMust(must);
      },
      clearMustChangePassword: () => {
        localStorage.removeItem(MUST_KEY);
        setMust(false);
      },
      logout: () => {
        setToken(null);
        localStorage.removeItem("sas_user");
        localStorage.removeItem(MUST_KEY);
        setUser(null);
        setMust(false);
      },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
