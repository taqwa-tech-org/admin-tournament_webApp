import { useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, PlusCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTitle } from "@/lib/hooks";
import { fmtDateTime } from "@/lib/format";
import type { MatchCard, Paged } from "@/lib/types";
import { Load, TableCard, Tabs, useGet } from "@/components/kit";
import { Badge, Empty, MatchStatusBadge, PageTitle, Pager } from "@/components/ui";

type Row = MatchCard & { pendingReviews: number; roomSet: boolean };

export default function MatchesPage() {
  useTitle("Matches");
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState("active");
  const [scope, setScope] = useState<"mine" | "all">(isAdmin ? "all" : "mine");
  const [page, setPage] = useState(1);
  const q = useGet<Paged & { matches: Row[] }>(`/staff/matches?status=${status}&scope=${scope}&page=${page}`, { refetchInterval: 30_000 });

  return (
    <>
      <PageTitle
        title="Matches"
        sub="Set rooms, start matches, review results."
        right={
          <Link to="/matches/new" className="btn-primary">
            <PlusCircle className="h-4 w-4" /> New match
          </Link>
        }
      />
      <div className="flex flex-wrap items-start gap-3">
        <Tabs
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          items={[
            { value: "active", label: "Running & upcoming" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
            { value: "", label: "All" },
          ]}
        />
        {isAdmin && (
          <Tabs
            value={scope}
            onChange={(v) => {
              setScope(v);
              setPage(1);
            }}
            items={[
              { value: "all", label: "All managers" },
              { value: "mine", label: "Created by me" },
            ]}
          />
        )}
      </div>
      <Load q={q}>
        {(d) =>
          d.matches.length === 0 ? (
            <Empty title="No matches here" text="Create a match from a template to get started." />
          ) : (
            <TableCard>
              <table className="table">
                <thead>
                  <tr>
                    <th>Match</th>
                    <th>Start</th>
                    <th>Entries</th>
                    <th>Status</th>
                    <th>To do</th>
                  </tr>
                </thead>
                <tbody>
                  {d.matches.map((m) => {
                    const late = m.status === "OPEN" && new Date(m.startAt) <= new Date();
                    const underfilled = m.minEntries > 0 && m.booked < m.minEntries;
                    return (
                      <tr key={m.id} className="hover:bg-surface-2/50">
                        <td>
                          <Link to={`/matches/${m.id}`} className="font-semibold hover:text-brand-2">
                            {m.title}
                          </Link>
                          <span className="block text-xs text-muted">
                            {m.game.name} · {m.modeName} · {m.format}
                            {m.manager && isAdmin ? ` · ${m.manager.name}` : ""}
                          </span>
                        </td>
                        <td className="text-xs whitespace-nowrap">{fmtDateTime(m.startAt)}</td>
                        <td className={underfilled && m.status === "OPEN" ? "text-warn" : ""}>
                          {m.booked}/{m.slots}
                          {m.minEntries > 0 && <span className="block text-[11px] text-muted">min {m.minEntries}</span>}
                        </td>
                        <td>
                          <MatchStatusBadge status={m.status} bookingOpen={m.bookingOpen} />
                        </td>
                        <td className="space-x-1 text-xs">
                          {!m.roomSet && (m.status === "OPEN" || m.status === "LIVE") && <Badge tone="warn">Set room</Badge>}
                          {m.pendingReviews > 0 && <Badge tone="info">{m.pendingReviews} result(s)</Badge>}
                          {late && (
                            <Badge tone="bad">
                              <AlertTriangle className="h-3 w-3" /> Start or reschedule
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
