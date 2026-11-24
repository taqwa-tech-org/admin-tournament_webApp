import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import {
  BarChart3, Ban, Coins, CreditCard, ExternalLink, FileBox, Gamepad2, Image, KeyRound, LayoutDashboard, LogOut, Menu, PlusCircle, ScrollText,
  Settings, Shield, Swords, Trophy, UserCog, Users, Wallet, X,
} from "lucide-react";
import { WEB_URL } from "@/lib/api";
import { ROLE_LABEL, useAuth } from "@/lib/auth";
import { useGet } from "./kit";

type Item = { to: string; label: string; icon: typeof Users; end?: boolean; owner?: boolean; managerOnly?: boolean; badge?: "payments" | "appeals" };
type Section = { title: string; admin?: boolean; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "Matches",
    items: [
      { to: "/matches", label: "Matches", icon: Swords, end: true },
      { to: "/matches/new", label: "New match", icon: PlusCircle },
      { to: "/maps", label: "Map pictures", icon: Image },
      { to: "/my-earnings", label: "My earnings", icon: Wallet, managerOnly: true },
    ],
  },
  {
    title: "Operations",
    admin: true,
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/payments", label: "Deposits & withdrawals", icon: CreditCard, badge: "payments" },
      { to: "/moderation", label: "Bans & appeals", icon: Ban, badge: "appeals" },
      { to: "/players", label: "Players", icon: Users },
      { to: "/managers", label: "Managers", icon: UserCog },
      { to: "/earnings", label: "Manager pay", icon: Coins },
    ],
  },
  {
    title: "Owner",
    admin: true,
    items: [
      { to: "/revenue", label: "Revenue report", icon: BarChart3, owner: true },
      { to: "/templates", label: "Templates & prizes", icon: Trophy, owner: true },
      { to: "/catalog", label: "Games & maps", icon: Gamepad2, owner: true },
      { to: "/files", label: "APK / files", icon: FileBox, owner: true },
      { to: "/admins", label: "Admins", icon: Shield, owner: true },
      { to: "/settings", label: "Settings", icon: Settings, owner: true },
      { to: "/audit", label: "Audit log", icon: ScrollText, owner: true },
    ],
  },
];

type Dash = { attention: { pendingDeposits: number; pendingWithdrawals: number; pendingAppeals: number; pendingReviews: number } };

export function Layout() {
  const { user, logout, isAdmin, isOwner } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);
  // Counters in the menu (admins), refreshed every minute.
  const dash = useGet<Dash>(isAdmin ? "/admin/dashboard" : null, { refetchInterval: 60_000 });
  if (!user) return null;
  const counts = { payments: (dash.data?.attention.pendingDeposits ?? 0) + (dash.data?.attention.pendingWithdrawals ?? 0), appeals: dash.data?.attention.pendingAppeals ?? 0 };
  const sections = SECTIONS.filter((s) => !s.admin || isAdmin)
    .map((s) => ({ ...s, items: s.items.filter((i) => (!i.owner || isOwner) && (!i.managerOnly || user.role === "MANAGER")) }))
    .filter((s) => s.items.length);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur md:h-dvh md:overflow-y-auto md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 p-4">
          <Link to={isAdmin ? "/" : "/matches"} className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-7 w-7" />
            <span className="font-display text-lg font-bold tracking-wider uppercase">Admin</span>
          </Link>
          <span className="rounded-md bg-brand/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand uppercase">{ROLE_LABEL[user.role]}</span>
          <button className="btn-ghost btn-sm md:hidden" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        <nav className={`${open ? "block" : "hidden"} space-y-4 px-2 pb-4 md:block`}>
          {sections.map((s) => (
            <div key={s.title}>
              <div className="px-3 pb-1 text-[10px] font-semibold tracking-widest text-muted/70 uppercase">{s.title}</div>
              <div className="space-y-0.5">
                {s.items.map((i) => (
                  <NavLink
                    key={i.to}
                    to={i.to}
                    end={i.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-brand/15 font-semibold text-ink shadow-[inset_3px_0_0_var(--color-brand)]" : "text-muted hover:bg-surface-2 hover:text-ink"}`
                    }
                  >
                    <i.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{i.label}</span>
                    {i.badge && counts[i.badge] > 0 && <span className="rounded-full bg-bad px-1.5 text-[10px] font-bold text-white">{counts[i.badge]}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
          <div className="space-y-0.5 border-t border-line pt-3">
            <a href={WEB_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink">
              <ExternalLink className="h-4 w-4" /> Player website
            </a>
            <NavLink to="/change-password" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink">
              <KeyRound className="h-4 w-4" /> Change password
            </NavLink>
            <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-bad/10 hover:text-bad">
              <LogOut className="h-4 w-4" /> Log out
            </button>
            <p className="px-3 pt-2 text-[11px] text-muted">
              {user.name} · {user.phone}
            </p>
          </div>
        </nav>
      </aside>
      <main className="min-w-0 px-4 py-5 md:px-8 md:py-7">
        <Outlet />
      </main>
    </div>
  );
}
