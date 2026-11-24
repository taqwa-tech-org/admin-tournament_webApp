import { useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";
import { useTitle } from "@/lib/hooks";
import { fmtDate } from "@/lib/format";
import type { Paged } from "@/lib/types";
import { Load, TableCard, useGet } from "@/components/kit";
import { Badge, Empty, PageTitle, Pager, statusTone } from "@/components/ui";

type P = { id: string; name: string; phone: string; status: string; suspendedUntil: string | null; depositTokens: number; winningTokens: number; matches: number; bans: number; createdAt: string; lastLoginAt: string | null };

export default function PlayersPage() {
  useTitle("Players");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const q = useGet<Paged & { players: P[] }>(`/admin/players?q=${encodeURIComponent(search)}&status=${status}&page=${page}`);
  return (
    <>
      <PageTitle title="Players" sub="Search by name, phone, referral code or in-game ID / name." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form
          className="flex flex-1 items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(String(new FormData(e.currentTarget).get("q") ?? "").trim());
            setPage(1);
          }}
        >
          <input className="input max-w-sm" name="q" placeholder="Search players" defaultValue={search} />
          <button className="btn-ghost" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
        </form>
        {["", "ACTIVE", "SUSPENDED", "BANNED"].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`chip ${status === s ? "border-brand bg-brand/15 text-brand-2" : "border-line text-muted"}`}>
            {s ? s.toLowerCase() : "all"}
          </button>
        ))}
      </div>
      <Load q={q}>
        {(d) =>
          d.players.length === 0 ? (
            <Empty title="No players found" />
          ) : (
            <TableCard right={<span className="text-xs text-muted">{d.total} players</span>}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th className="text-right">Deposit</th>
                    <th className="text-right">Winnings</th>
                    <th className="text-right">Matches</th>
                    <th className="text-right">Bans</th>
                    <th>Joined</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.players.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-2/50">
                      <td>
                        <Link to={`/players/${p.id}`} className="font-semibold hover:text-brand-2">
                          {p.name}
                        </Link>
                        <span className="block text-xs text-muted">{p.phone}</span>
                      </td>
                      <td className="text-right">{p.depositTokens}</td>
                      <td className="text-right text-ok">{p.winningTokens}</td>
                      <td className="text-right">{p.matches}</td>
                      <td className={`text-right ${p.bans ? "text-bad" : ""}`}>{p.bans}</td>
                      <td className="text-xs">{fmtDate(p.createdAt)}</td>
                      <td>
                        <Badge tone={p.status === "ACTIVE" ? "ok" : statusTone(p.status === "SUSPENDED" ? "PENDING" : "BANNED")}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pager page={d.page} total={d.total} limit={d.limit} onPage={setPage} />
            </TableCard>
          )
        }
      </Load>
    </>
  );
}
