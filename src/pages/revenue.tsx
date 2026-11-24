import { useTitle } from "@/lib/hooks";
import { bdt, n } from "@/lib/format";
import { Load, PeriodFilter, TableCard, useGet, usePeriod } from "@/components/kit";
import { Notice, PageTitle, Stat } from "@/components/ui";

type R = {
  from: string;
  to: string;
  tokenPriceBdt: number;
  cashFlow: { depositsCount: number; depositsBdt: number; withdrawalsCount: number; withdrawalsPaidBdt: number; withdrawFeeBdt: number; managerPayoutsBdt: number; netCashBdt: number };
  ledger: { entryTokens: number; prizeTokens: number; bonusTokens: number; adjustTokens: number };
  matches: { completed: number; entryTokens: number; forfeitTokens: number; prizeTokens: number; marginTokens: number; marginPct: number; managerEarningsBdt: number };
  netProfitBdt: number;
  byGame: { game: string; matches: number; entryTokens: number; forfeitTokens: number; prizeTokens: number; managerBdt: number }[];
  liabilities: { depositTokens: number; winningTokens: number; totalBdt: number };
};

export default function RevenuePage() {
  useTitle("Revenue report");
  const [p, setP] = usePeriod();
  const q = useGet<R>(`/admin/reports/revenue?from=${p.from}&to=${p.to}`);
  return (
    <>
      <PageTitle title="Revenue report" sub="How much the platform earned, where it came from, and what you owe players." />
      <PeriodFilter value={p} onChange={setP} />
      <Load q={q}>
        {(d) => (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className={`card ${d.netProfitBdt >= 0 ? "border-ok/40 bg-ok/5" : "border-bad/40 bg-bad/5"}`}>
                <div className="text-xs text-muted">Net profit (completed matches)</div>
                <div className={`text-3xl font-bold ${d.netProfitBdt >= 0 ? "text-ok" : "text-bad"}`}>{bdt(d.netProfitBdt)}</div>
                <div className="text-[11px] text-muted">Match margin − manager pay − bonuses + withdrawal fees</div>
              </div>
              <div className="card">
                <div className="text-xs text-muted">Match margin</div>
                <div className="text-3xl font-bold">{n(d.matches.marginTokens)} tokens</div>
                <div className="text-[11px] text-muted">{d.matches.marginPct}% of entry fees kept after prizes</div>
              </div>
              <div className="card">
                <div className="text-xs text-muted">Net cash in (deposits − withdrawals − manager payouts)</div>
                <div className="text-3xl font-bold">{bdt(d.cashFlow.netCashBdt)}</div>
              </div>
            </div>
            {d.matches.marginPct < 10 && d.matches.completed > 0 && (
              <Notice title="Low margin">Prizes are taking almost all entry fees. Review template prizes (Templates → profit check) or raise minimum entries.</Notice>
            )}

            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted">Completed matches ({d.matches.completed})</h2>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                <Stat label="Entry fees" value={n(d.matches.entryTokens)} />
                <Stat label="Forfeited by bans" value={n(d.matches.forfeitTokens)} />
                <Stat label="Prizes paid" value={n(d.matches.prizeTokens)} />
                <Stat label="Margin" value={n(d.matches.marginTokens)} accent />
                <Stat label="Manager pay" value={bdt(d.matches.managerEarningsBdt)} />
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted">Money in and out</h2>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                <Stat label={`Deposits (${d.cashFlow.depositsCount})`} value={bdt(d.cashFlow.depositsBdt)} />
                <Stat label={`Withdrawals paid (${d.cashFlow.withdrawalsCount})`} value={bdt(d.cashFlow.withdrawalsPaidBdt)} />
                <Stat label="Withdrawal fees" value={bdt(d.cashFlow.withdrawFeeBdt)} />
                <Stat label="Paid to managers" value={bdt(d.cashFlow.managerPayoutsBdt)} />
                <Stat label="Bonuses given (tokens)" value={n(d.ledger.bonusTokens)} />
              </div>
            </div>

            <TableCard title="By game">
              {d.byGame.length === 0 ? (
                <p className="p-4 text-sm text-muted">No completed matches in this period.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th className="text-right">Matches</th>
                      <th className="text-right">Entry fees</th>
                      <th className="text-right">Prizes</th>
                      <th className="text-right">Margin</th>
                      <th className="text-right">Manager pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.byGame.map((g) => {
                      const margin = g.entryTokens + g.forfeitTokens - g.prizeTokens;
                      return (
                        <tr key={g.game}>
                          <td className="font-semibold">{g.game}</td>
                          <td className="text-right">{g.matches}</td>
                          <td className="text-right">{n(g.entryTokens)}</td>
                          <td className="text-right">{n(g.prizeTokens)}</td>
                          <td className={`text-right font-semibold ${margin >= 0 ? "text-ok" : "text-bad"}`}>{n(margin)}</td>
                          <td className="text-right">{bdt(g.managerBdt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </TableCard>

            <div className="card border-info/40">
              <h2 className="font-semibold">Owed to players right now</h2>
              <p className="mb-3 text-xs text-muted">Keep at least this much money available in your payment accounts. Players can spend deposit tokens and withdraw winnings at any time.</p>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Deposit tokens" value={n(d.liabilities.depositTokens)} />
                <Stat label="Winnings" value={n(d.liabilities.winningTokens)} />
                <Stat label="Total value" value={bdt(d.liabilities.totalBdt)} accent />
              </div>
            </div>
          </div>
        )}
      </Load>
    </>
  );
}
