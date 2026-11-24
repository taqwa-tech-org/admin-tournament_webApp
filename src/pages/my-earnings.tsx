import { useTitle } from "@/lib/hooks";
import { bdt, fmtDateTime } from "@/lib/format";
import { EarningsTable, type EarningRow } from "@/components/earnings-table";
import { Load, PeriodFilter, TableCard, useGet, usePeriod } from "@/components/kit";
import { PageTitle, Stat } from "@/components/ui";

type D = {
  rows: EarningRow[];
  balance: { earned: number; paid: number; due: number };
  sharePct: number;
  payouts: { id: string; amountBdt: number; method: string; trxId: string | null; note: string | null; createdAt: string }[];
};

export default function MyEarningsPage() {
  useTitle("My earnings");
  const [p, setP] = usePeriod();
  const q = useGet<D>(`/staff/earnings?from=${p.from}&to=${p.to}`);
  return (
    <>
      <PageTitle title="My earnings" sub="Your share of the platform commission on matches you completed. Prizes and bans never change your pay." />
      <Load q={q}>
        {(d) => (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Your share" value={`${d.sharePct}%`} hint="of the commission, for new matches" />
              <Stat label="Earned (all time)" value={bdt(d.balance.earned)} />
              <Stat label="Paid to you" value={bdt(d.balance.paid)} />
              <Stat label="Due" value={bdt(d.balance.due)} accent />
            </div>
            <PeriodFilter value={p} onChange={setP} />
            <EarningsTable rows={d.rows} />
            <TableCard title="Payments received">
              {d.payouts.length === 0 ? (
                <p className="p-4 text-sm text-muted">No payments yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.payouts.map((x) => (
                      <tr key={x.id}>
                        <td className="text-xs">{fmtDateTime(x.createdAt)}</td>
                        <td className="font-semibold text-ok">{bdt(x.amountBdt)}</td>
                        <td className="text-xs">
                          {x.method}
                          {x.trxId ? ` · ${x.trxId}` : ""}
                        </td>
                        <td className="text-xs text-muted">{x.note ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TableCard>
          </div>
        )}
      </Load>
    </>
  );
}
