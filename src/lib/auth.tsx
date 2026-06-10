import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setToken, getToken } from "./api";

type Role = "admin" | "security";
interface User { username: string; role: Role }
interface AuthCtx {
  user: User | null;
  login: (u: User, token: string) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("sas_user");
    if (raw && getToken()) {
      try { setUser(JSON.parse(raw)); } catch { /* noop */ }
    }
  }, []);

  return (
    <Ctx.Provider value={{
      user,
      login: (u, token) => {
        setToken(token);
        localStorage.setItem("sas_user", JSON.stringify(u));
        setUser(u);
      },
      logout: () => {
        setToken(null);
        localStorage.removeItem("sas_user");
        setUser(null);
      },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
