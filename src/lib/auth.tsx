import { createContext, useCallback, useContext, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export type Role = "MANAGER" | "ADMIN" | "SUPER_ADMIN";
export type Staff = { id: string; name: string; phone: string; role: Role; status: string; mustChangePassword: boolean; managerSharePct: number | null };

type Ctx = {
  user: Staff | null;
  loading: boolean;
  setUser: (u: Staff | null) => void;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isOwner: boolean;
};
const AuthCtx = createContext<Ctx>(null as unknown as Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: Staff | null }>("/staff/auth/me").then((r) => r.user),
    staleTime: 60_000,
    retry: 1,
  });
  const setUser = useCallback((u: Staff | null) => qc.setQueryData(["me"], u), [qc]);
  const logout = useCallback(async () => {
    await api("/staff/auth/logout", { method: "POST" }).catch(() => undefined);
    qc.clear();
    qc.setQueryData(["me"], null);
  }, [qc]);

  useEffect(() => {
    const lost = () => qc.setQueryData(["me"], null);
    const refresh = () => qc.invalidateQueries({ queryKey: ["me"] });
    window.addEventListener("auth:lost", lost);
    window.addEventListener("auth:refresh", refresh);
    return () => {
      window.removeEventListener("auth:lost", lost);
      window.removeEventListener("auth:refresh", refresh);
    };
  }, [qc]);

  const user = me.data ?? null;
  const isOwner = user?.role === "SUPER_ADMIN";
  const isAdmin = isOwner || user?.role === "ADMIN";
  return <AuthCtx.Provider value={{ user, loading: me.isLoading, setUser, logout, isAdmin, isOwner }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
export const ROLE_LABEL: Record<string, string> = { MANAGER: "Manager", ADMIN: "Admin", SUPER_ADMIN: "Super Admin", PLAYER: "Player" };
