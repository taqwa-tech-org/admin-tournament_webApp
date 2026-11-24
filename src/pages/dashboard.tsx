import { Link } from "react-router";
import { Ban, CreditCard, FileCheck2, Gamepad2, Radio, UserPlus, Users } from "lucide-react";
import { useTitle } from "@/lib/hooks";
import { bdt, n } from "@/lib/format";
import { Load, useGet } from "@/components/kit";
import { PageTitle, Stat } from "@/components/ui";

type D = {
  attention: { pendingDeposits: number; pendingWithdrawals: number; pendingAppeals: number; pendingReviews: number };
  counts: { players: number; newPlayers: number; managers: number; activeMatches: number; liveMatches: number };
  today: { depositsBdt: number; withdrawalsBdt: number; entryTokens: number; prizeTokens: number };
  trend: { day: string; entries: number; prizes: number }[];
};

export default function DashboardPage() {
  useTitle("Dashboard");
  const q = useGet<D>("/admin/dashboard", { refetchInterval: 30_000 });
  return (
    <>
      <PageTitle title="Dashboard" sub="What needs attention now, and how today is going." />
      <Load q={q}>
        {(d) => {
          const todo = [
            { to: "/payments", label: "Deposits to verify", value: d.attention.pendingDeposits, icon: CreditCard },
            { to: "/payments?tab=withdrawals", label: "Withdrawals to pay", value: d.attention.pendingWithdrawals, icon: CreditCard },
            { to: "/moderation", label: "Appeals to decide", value: d.attention.pendingAppeals, icon: Ban },
            { to: "/matches", label: "Results to review", value: d.attention.pendingReviews, icon: FileCheck2 },
          ];
          const max = Math.max(1, ...d.trend.map((t) => Math.max(t.entries, t.prizes)));
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {todo.map((t) => (
                  <Link key={t.label} to={t.to} className={`card flex items-center gap-3 transition hover:border-brand/50 ${t.value > 0 ? "border-warn/50 bg-warn/5" : ""}`}>
                    <t.icon className={`h-6 w-6 ${t.value > 0 ? "text-warn" : "text-muted"}`} />
                    <div>
                      <div className="text-2xl font-bold">{t.value}</div>
                      <div className="text-xs text-muted">{t.label}</div>
                    </div>
                  </Link>
                ))}
              </div>

              <div>
                <h2 className="mb-2 text-sm font-semibold text-muted">Today (Bangladesh time)</h2>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <Stat label="Deposits approved" value={bdt(d.today.depositsBdt)} />
                  <Stat label="Withdrawals paid" value={bdt(d.today.withdrawalsBdt)} />
                  <Stat label="Entry fees (tokens)" value={n(d.today.entryTokens)} accent />
                  <Stat label="Prizes paid (tokens)" value={n(d.today.prizeTokens)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                <Stat label="Players" value={<span className="flex items-center gap-1"><Users className="h-4 w-4 text-muted" /> {n(d.counts.players)}</span>} />
                <Stat label="New today" value={<span className="flex items-center gap-1"><UserPlus className="h-4 w-4 text-muted" /> {n(d.counts.newPlayers)}</span>} />
                <Stat label="Managers" value={n(d.counts.managers)} />
                <Stat label="Active matches" value={<span className="flex items-center gap-1"><Gamepad2 className="h-4 w-4 text-muted" /> {n(d.counts.activeMatches)}</span>} />
                <Stat label="Live now" value={<span className="flex items-center gap-1"><Radio className="h-4 w-4 text-bad" /> {n(d.counts.liveMatches)}</span>} />
              </div>

              <div className="card">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">Last 14 days: entry fees vs prizes (tokens)</h2>
                  <div className="flex gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Entry fees
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-sm bg-info" /> Prizes
                    </span>
                  </div>
                </div>
                <div className="flex h-44 items-end gap-1.5">
                  {d.trend.map((t) => (
                    <div key={t.day} className="group relative flex h-full flex-1 flex-col justify-end">
                      <div className="flex h-full items-end gap-0.5">
                        <div className="flex-1 rounded-t bg-brand/80" style={{ height: `${(t.entries / max) * 100}%` }} />
                        <div className="flex-1 rounded-t bg-info/70" style={{ height: `${(t.prizes / max) * 100}%` }} />
                      </div>
                      <div className="mt-1 text-center text-[9px] text-muted">{t.day.slice(8)}</div>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg border border-line bg-bg px-2 py-1 text-[11px] whitespace-nowrap group-hover:block">
                        {t.day}: fees {n(t.entries)} · prizes {n(t.prizes)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }}
      </Load>
    </>
  );
}
