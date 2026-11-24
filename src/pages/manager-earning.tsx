import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useTitle } from "@/lib/hooks";
import { bdt, fmtDateTime } from "@/lib/format";
import type { Msg } from "@/lib/types";
import { EarningsTable, type EarningRow } from "@/components/earnings-table";
import { Btn, Load, PeriodFilter, TableCard, formObject, useGet, usePeriod } from "@/components/kit";
import { Field, PageTitle, Stat, Submit } from "@/components/ui";

type D = {
  manager: { id: string; name: string; phone: string; role: string; sharePct: number | null };
  defaultSharePct: number;
  activeMatches: number;
  rows: EarningRow[];
  balance: { earned: number; paid: number; due: number };
  payouts: { id: string; amountBdt: number; method: string; trxId: string | null; note: string | null; createdAt: string; paidBy: string }[];
};

export default function ManagerEarningPage() {
  const { id = "" } = useParams();
  const { isOwner } = useAuth();
  const [p, setP] = usePeriod();
  const path = `/admin/earnings/${id}?from=${p.from}&to=${p.to}`;
  const q = useGet<D>(path);
  const { run, busy } = useAction();
  useTitle(q.data?.manager.name ?? "Manager");
  const inv = { invalidate: [[path], ["/admin/earnings"]] };

  return (
    <>
      <Link to="/earnings" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Manager pay
      </Link>
      <Load q={q}>
        {(d) => (
          <div className="space-y-4">
            <PageTitle title={d.manager.name} sub={`${d.manager.phone} · ${d.activeMatches} active match(es)`} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Share" value={`${d.manager.sharePct ?? d.defaultSharePct}%`} hint={d.manager.sharePct === null ? "default" : "custom"} />
              <Stat label="Earned (all time)" value={bdt(d.balance.earned)} />
              <Stat label="Paid" value={bdt(d.balance.paid)} />
              <Stat label="Due now" value={bdt(d.balance.due)} accent />
            </div>

            {isOwner && (
              <div className="grid gap-4 lg:grid-cols-2">
                <form
                  className="card space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const f = formObject(form);
                    run("pay", () => api<Msg>(`/admin/earnings/${id}/payout`, { body: { amountBdt: Number(f.amountBdt), method: f.method, trxId: f.trxId || undefined, note: f.note || undefined } }), {
                      ...inv,
                      confirm: `Record a payment of ৳${f.amountBdt} to ${d.manager.name}?`,
                    }).then((r) => r && form.reset());
                  }}
                >
                  <h2 className="font-semibold">Record a payment</h2>
                  <p className="text-xs text-muted">Send the money yourself (bKash etc.), then record it here so the balance stays correct.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Amount (BDT)">
                      <input className="input" name="amountBdt" type="number" min={1} defaultValue={Math.max(1, d.balance.due)} required />
                    </Field>
                    <Field label="Method">
                      <input className="input" name="method" defaultValue="bKash" required />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="TrxID (optional)">
                      <input className="input" name="trxId" />
                    </Field>
                    <Field label="Note (optional)">
                      <input className="input" name="note" />
                    </Field>
                  </div>
                  <Submit busy={busy === "pay"}>Record payment</Submit>
                </form>
                <form
                  className="card space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = String(new FormData(e.currentTarget).get("sharePct") ?? "");
                    run("share", () => api<Msg>(`/admin/earnings/${id}/share`, { method: "PUT", body: { sharePct: v === "" ? null : Number(v) } }), inv);
                  }}
                >
                  <h2 className="font-semibold">Manager share</h2>
                  <p className="text-xs text-muted">Leave empty to use the default ({d.defaultSharePct}%). Applies to matches created from now on.</p>
                  <Field label="Share of commission (%)">
                    <input className="input" name="sharePct" type="number" min={0} max={100} defaultValue={d.manager.sharePct ?? ""} />
                  </Field>
                  <Btn busy={busy} k="share" type="submit" className="btn-ghost">
                    Save share
                  </Btn>
                </form>
              </div>
            )}

            <PeriodFilter value={p} onChange={setP} />
            <EarningsTable rows={d.rows} />
            <TableCard title="Payments">
              {d.payouts.length === 0 ? (
                <p className="p-4 text-sm text-muted">No payments recorded.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Note</th>
                      <th>By</th>
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
                        <td className="text-xs text-muted">{x.note}</td>
                        <td className="text-xs">{x.paidBy}</td>
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
