import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { useAction, useTitle } from "@/lib/hooks";
import { bdt, fmtDateTime } from "@/lib/format";
import type { Msg, Paged } from "@/lib/types";
import { Btn, Load, Modal, TableCard, Tabs, formObject, useGet } from "@/components/kit";
import { Badge, CopyField, Empty, Field, PageTitle, Pager, Submit, statusTone } from "@/components/ui";

type U = { id: string | null; name: string; phone: string };
type Dep = { id: string; user: U; method: string; trxId: string; senderNumber: string; amountBdt: number; tokens: number; status: string; note: string | null; createdAt: string; reviewedAt: string | null; reviewedBy: string };
type Wd = { id: string; user: U; method: string; accountNo: string; tokens: number; grossBdt: number; feeBdt: number; amountBdt: number; status: string; payoutTrxId: string | null; note: string | null; createdAt: string; reviewedAt: string | null; reviewedBy: string };

export default function PaymentsPage() {
  useTitle("Deposits & withdrawals");
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") === "withdrawals" ? "withdrawals" : "deposits";
  return (
    <>
      <PageTitle title="Deposits & withdrawals" sub="Check every TrxID in your bKash / Nagad app before approving." />
      <Tabs
        value={tab}
        onChange={(v) => setSp(v === "deposits" ? {} : { tab: v })}
        items={[
          { value: "deposits", label: "Deposits" },
          { value: "withdrawals", label: "Withdrawals" },
        ]}
      />
      {tab === "deposits" ? <Deposits /> : <Withdrawals />}
    </>
  );
}

function UserCell({ u }: { u: U }) {
  return (
    <td className="text-xs">
      {u.id ? (
        <Link to={`/players/${u.id}`} className="font-semibold text-ink hover:text-brand-2">
          {u.name}
        </Link>
      ) : (
        u.name
      )}
      <span className="block text-muted">{u.phone}</span>
    </td>
  );
}

function Deposits() {
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Dep | null>(null);
  const path = `/admin/payments/deposits?status=${status}&page=${page}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
  const q = useGet<Paged & { items: Dep[] }>(path, { refetchInterval: status === "PENDING" ? 30_000 : undefined });
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {["PENDING", "APPROVED", "REJECTED"].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`chip ${status === s ? "border-brand bg-brand/15 text-brand-2" : "border-line text-muted"}`}>
            {s.toLowerCase()}
          </button>
        ))}
        <form
          className="ml-auto flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(String(new FormData(e.currentTarget).get("q") ?? "").trim());
            setPage(1);
          }}
        >
          <input className="input w-48 py-1.5" name="q" placeholder="Find TrxID" />
          <button className="btn-ghost btn-sm" aria-label="Search">
            <Search className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
      <Load q={q}>
        {(d) =>
          d.items.length === 0 ? (
            <Empty title="Nothing here" text={status === "PENDING" ? "All deposits are handled." : undefined} />
          ) : (
            <TableCard>
              <table className="table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Amount</th>
                    <th>Method · TrxID</th>
                    <th>Sender</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.items.map((x) => (
                    <tr key={x.id}>
                      <UserCell u={x.user} />
                      <td className="font-semibold">
                        {bdt(x.amountBdt)}
                        <span className="block text-[11px] font-normal text-muted">{x.tokens} tokens</span>
                      </td>
                      <td className="font-mono text-xs">
                        {x.method}
                        <span className="block font-bold">{x.trxId}</span>
                      </td>
                      <td className="font-mono text-xs">{x.senderNumber}</td>
                      <td className="text-xs whitespace-nowrap">{fmtDateTime(x.createdAt)}</td>
                      <td>
                        <Badge tone={statusTone(x.status)}>{x.status}</Badge>
                        {x.reviewedBy && <span className="block text-[11px] text-muted">by {x.reviewedBy}</span>}
                        {x.note && <span className="block text-[11px] text-muted">{x.note}</span>}
                      </td>
                      <td className="text-right">
                        {x.status === "PENDING" && (
                          <button className="btn-primary btn-sm" onClick={() => setOpen(x)}>
                            Review
                          </button>
                        )}
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
      <DepositModal dep={open} onClose={() => setOpen(null)} path={path} />
    </>
  );
}

function DepositModal({ dep, onClose, path }: { dep: Dep | null; onClose: () => void; path: string }) {
  const { run, busy } = useAction();
  if (!dep) return null;
  const decide = (decision: "approve" | "reject", f: Record<string, string>) =>
    run(decision, () => api<Msg>(`/admin/payments/deposits/${dep.id}`, { body: { decision, note: f.note || undefined, amountBdt: decision === "approve" && f.amountBdt ? Number(f.amountBdt) : undefined } }), {
      invalidate: [[path], ["/admin/dashboard"]],
    }).then((r) => r && onClose());
  return (
    <Modal open onClose={onClose} title={`Deposit from ${dep.user.name}`}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          decide("approve", formObject(e.currentTarget));
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <CopyField label="TrxID" value={dep.trxId} />
          <CopyField label="Sender" value={dep.senderNumber} />
        </div>
        <p className="text-sm text-muted">
          Player says: <b className="text-ink">{bdt(dep.amountBdt)}</b> by {dep.method}. Open your {dep.method} app, find this TrxID and check the amount.
        </p>
        <Field label="Amount actually received (BDT)" hint="Change only if the player typed a different amount than you received.">
          <input className="input" name="amountBdt" type="number" min={1} defaultValue={dep.amountBdt} />
        </Field>
        <Field label="Note (required to reject; the player sees it)">
          <input className="input" name="note" maxLength={200} id="dep-note" />
        </Field>
        <div className="flex gap-2">
          <Submit busy={busy === "approve"} className="btn-primary flex-1">
            Approve & add tokens
          </Submit>
          <Btn
            busy={busy}
            k="reject"
            className="btn-danger"
            onClick={() => {
              const note = (document.getElementById("dep-note") as HTMLInputElement | null)?.value ?? "";
              decide("reject", { note });
            }}
          >
            Reject
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function Withdrawals() {
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Wd | null>(null);
  const path = `/admin/payments/withdrawals?status=${status}&page=${page}`;
  const q = useGet<Paged & { items: Wd[] }>(path, { refetchInterval: status === "PENDING" ? 30_000 : undefined });
  return (
    <>
      <div className="mb-3 flex gap-2">
        {["PENDING", "PAID", "REJECTED"].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`chip ${status === s ? "border-brand bg-brand/15 text-brand-2" : "border-line text-muted"}`}>
            {s.toLowerCase()}
          </button>
        ))}
      </div>
      <Load q={q}>
        {(d) =>
          d.items.length === 0 ? (
            <Empty title="Nothing here" text={status === "PENDING" ? "All withdrawals are handled." : undefined} />
          ) : (
            <TableCard>
              <table className="table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Send</th>
                    <th>To</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.items.map((x) => (
                    <tr key={x.id}>
                      <UserCell u={x.user} />
                      <td className="font-semibold text-ok">
                        {bdt(x.amountBdt)}
                        <span className="block text-[11px] font-normal text-muted">
                          {x.tokens} tokens{x.feeBdt ? ` · fee ${bdt(x.feeBdt)}` : ""}
                        </span>
                      </td>
                      <td className="font-mono text-xs">
                        {x.method}
                        <span className="block font-bold">{x.accountNo}</span>
                      </td>
                      <td className="text-xs whitespace-nowrap">{fmtDateTime(x.createdAt)}</td>
                      <td>
                        <Badge tone={statusTone(x.status)}>{x.status}</Badge>
                        {x.payoutTrxId && <span className="block font-mono text-[11px] text-muted">{x.payoutTrxId}</span>}
                        {x.note && <span className="block text-[11px] text-muted">{x.note}</span>}
                      </td>
                      <td className="text-right">
                        {x.status === "PENDING" && (
                          <button className="btn-primary btn-sm" onClick={() => setOpen(x)}>
                            Process
                          </button>
                        )}
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
      <WithdrawModal wd={open} onClose={() => setOpen(null)} path={path} />
    </>
  );
}

function WithdrawModal({ wd, onClose, path }: { wd: Wd | null; onClose: () => void; path: string }) {
  const { run, busy } = useAction();
  const [mode, setMode] = useState<"paid" | "reject">("paid");
  if (!wd) return null;
  return (
    <Modal open onClose={onClose} title={`Withdrawal for ${wd.user.name}`}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = formObject(e.currentTarget);
          run(mode, () => api<Msg>(`/admin/payments/withdrawals/${wd.id}`, { body: { decision: mode, payoutTrxId: f.payoutTrxId || undefined, note: f.note || undefined } }), {
            invalidate: [[path], ["/admin/dashboard"]],
          }).then((r) => r && onClose());
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <CopyField label={`${wd.method} number`} value={wd.accountNo} />
          <CopyField label="Amount to send" value={String(wd.amountBdt)} />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode("paid")} className={`chip ${mode === "paid" ? "border-ok bg-ok/15 text-ok" : "border-line text-muted"}`}>
            I sent the money
          </button>
          <button type="button" onClick={() => setMode("reject")} className={`chip ${mode === "reject" ? "border-bad bg-bad/15 text-bad" : "border-line text-muted"}`}>
            Reject (return tokens)
          </button>
        </div>
        {mode === "paid" ? (
          <Field label="TrxID of your payment">
            <input className="input font-mono" name="payoutTrxId" required maxLength={40} />
          </Field>
        ) : (
          <Field label="Reason (the player sees it)">
            <input className="input" name="note" required maxLength={200} />
          </Field>
        )}
        <Submit busy={busy === mode} className={mode === "paid" ? "btn-primary w-full" : "btn-danger w-full"}>
          {mode === "paid" ? "Mark as paid" : "Reject withdrawal"}
        </Submit>
      </form>
    </Modal>
  );
}
