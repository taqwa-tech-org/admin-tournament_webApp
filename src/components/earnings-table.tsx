import { bdt, fmtDateTime, n } from "@/lib/format";
import { TableCard } from "./kit";

export type EarningRow = {
  id: string; title: string; game: string; mode: string; completedAt: string; entries: number; bannedCount: number; entryTokens: number;
  forfeitTokens: number; prizeTokens: number; commissionTokens: number; sharePct: number; earningBdt: number;
};

/** Completed matches with how the manager's pay was calculated. */
export function EarningsTable({ rows }: { rows: EarningRow[] }) {
  const total = rows.reduce((a, r) => a + r.earningBdt, 0);
  return (
    <TableCard title={`Completed matches (${rows.length})`} right={<span className="text-sm">Total: <b className="text-ok">{bdt(total)}</b></span>}>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted">No completed matches in this period.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Match</th>
              <th>Completed</th>
              <th className="text-right">Entries</th>
              <th className="text-right">Entry fees</th>
              <th className="text-right">Prizes</th>
              <th className="text-right">Commission</th>
              <th className="text-right">Share</th>
              <th className="text-right">Earning</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.title}
                  <span className="block text-[11px] text-muted">
                    {r.game} · {r.mode}
                    {r.bannedCount ? ` · ${r.bannedCount} banned (${r.forfeitTokens} forfeited)` : ""}
                  </span>
                </td>
                <td className="text-xs whitespace-nowrap">{fmtDateTime(r.completedAt)}</td>
                <td className="text-right">{r.entries}</td>
                <td className="text-right">{n(r.entryTokens)}</td>
                <td className="text-right">{n(r.prizeTokens)}</td>
                <td className="text-right">{n(r.commissionTokens)}</td>
                <td className="text-right">{r.sharePct}%</td>
                <td className="text-right font-semibold text-ok">{bdt(r.earningBdt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </TableCard>
  );
}
