import { Link } from "react-router";
import { useTitle } from "@/lib/hooks";
import { bdt, n } from "@/lib/format";
import { Load, PeriodFilter, TableCard, useGet, usePeriod } from "@/components/kit";
import { Empty, PageTitle } from "@/components/ui";

type Row = {
  id: string; name: string; phone: string; sharePct: number; customShare: boolean; matches: number; entries: number; entryTokens: number; prizeTokens: number;
  forfeitTokens: number; commissionTokens: number; earningBdt: number; balance: { earned: number; paid: number; due: number };
};

export default function EarningsPage() {
  useTitle("Manager pay");
  const [p, setP] = usePeriod();
  const q = useGet<{ managers: Row[]; defaultSharePct: number; tokenPriceBdt: number }>(`/admin/earnings?from=${p.from}&to=${p.to}`);
  return (
    <>
      <PageTitle title="Manager pay" sub="Manager pay = entry fees of players who finished × commission % × manager share %. Prizes and bans do not affect it." />
      <PeriodFilter value={p} onChange={setP} />
      <Load q={q}>
        {(d) =>
          d.managers.length === 0 ? (
            <Empty title="No managers" />
          ) : (
            <TableCard right={<span className="text-xs text-muted">Default share {d.defaultSharePct}% · 1 token = {bdt(d.tokenPriceBdt)}</span>}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Manager</th>
                    <th className="text-right">Matches</th>
                    <th className="text-right">Entry fees</th>
                    <th className="text-right">Prizes</th>
                    <th className="text-right">Commission</th>
                    <th className="text-right">Share</th>
                    <th className="text-right">Earned (period)</th>
                    <th className="text-right">Due (all time)</th>
                  </tr>
                </thead>
                <tbody>
                  {d.managers.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link to={`/earnings/${m.id}`} className="font-semibold hover:text-brand-2">
                          {m.name}
                        </Link>
                        <span className="block text-xs text-muted">{m.phone}</span>
                      </td>
                      <td className="text-right">{m.matches}</td>
                      <td className="text-right">{n(m.entryTokens)}</td>
                      <td className="text-right">{n(m.prizeTokens)}</td>
                      <td className="text-right">{n(m.commissionTokens)}</td>
                      <td className="text-right">
                        {m.sharePct}%{m.customShare ? "" : <span className="text-muted"> (default)</span>}
                      </td>
                      <td className="text-right font-semibold">{bdt(m.earningBdt)}</td>
                      <td className={`text-right font-bold ${m.balance.due > 0 ? "text-warn" : "text-muted"}`}>{bdt(m.balance.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          )
        }
      </Load>
    </>
  );
}
