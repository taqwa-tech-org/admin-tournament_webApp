import { useState } from "react";
import { Link } from "react-router";
import { api, apiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useTitle } from "@/lib/hooks";
import { fmtDateTime } from "@/lib/format";
import { computePrize, type Reward } from "@/lib/prize";
import type { Msg, Paged } from "@/lib/types";
import { Btn, Load, Modal, TableCard, useGet } from "@/components/kit";
import { Badge, Field, Notice, PageTitle, Pager } from "@/components/ui";

type U = { id: string; name?: string; phone?: string };
type BanAppeal = { id: string; level: string; reason: string; note: string | null; days: number | null; forfeitTokens: number; appealText: string | null; createdAt: string; user: U; issuedBy: string; match: { id: string; title?: string } | null };
type ResultAppeal = {
  id: string; kills: number; placement: number; claims: number[]; reviewNote: string | null; appealText: string | null; imageCount: number; flags: string[]; user: U;
  match: { id: string; title: string; status: string; rewards: Reward[]; manualRuleIndexes: number[] } | null;
};
type D = {
  banAppeals: BanAppeal[];
  resultAppeals: ResultAppeal[];
  recent: { id: string; level: string; days: number | null; reason: string; status: string; appealStatus: string; createdAt: string; user: U; issuedBy: string; match: string | null }[];
  recentPage: Paged;
  reasons: { id: string; label: string; isActive: boolean }[];
};

export default function ModerationPage() {
  useTitle("Bans & appeals");
  const { isOwner } = useAuth();
  const [page, setPage] = useState(1);
  const path = `/admin/moderation?page=${page}`;
  const q = useGet<D>(path);
  const { run, busy } = useAction();
  const [result, setResult] = useState<ResultAppeal | null>(null);
  const inv = { invalidate: [[path], ["/admin/dashboard"]] };

  return (
    <>
      <PageTitle title="Bans & appeals" sub="Players can appeal a ban or a rejected result once. Your decision is final." />
      <Load q={q}>
        {(d) => (
          <div className="space-y-5">
            <section>
              <h2 className="mb-2 font-semibold">Ban appeals ({d.banAppeals.length})</h2>
              {d.banAppeals.length === 0 ? (
                <p className="text-sm text-muted">No pending ban appeals.</p>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {d.banAppeals.map((b) => (
                    <div key={b.id} className="card space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="bad">
                          {b.level}
                          {b.days ? ` · ${b.days}d` : ""}
                        </Badge>
                        <Link to={`/players/${b.user.id}`} className="font-semibold hover:text-brand-2">
                          {b.user.name}
                        </Link>
                        <span className="text-xs text-muted">{b.user.phone}</span>
                      </div>
                      <p className="text-sm">
                        <span className="text-muted">Reason:</span> {b.reason}
                        {b.note ? ` — ${b.note}` : ""}
                      </p>
                      <p className="text-xs text-muted">
                        By {b.issuedBy} · {fmtDateTime(b.createdAt)}
                        {b.match && (
                          <>
                            {" · "}
                            <Link to={`/matches/${b.match.id}`} className="underline">
                              {b.match.title}
                            </Link>
                          </>
                        )}
                        {b.forfeitTokens ? ` · ${b.forfeitTokens} tokens forfeited` : ""}
                      </p>
                      <div className="rounded-lg border border-line bg-surface-2 p-2 text-sm">“{b.appealText}”</div>
                      <div className="flex gap-2">
                        <Btn busy={busy} k={`a${b.id}`} className="btn-primary btn-sm" onClick={() => run(`a${b.id}`, () => api<Msg>(`/admin/ban-appeals/${b.id}`, { body: { decision: "accept" } }), { ...inv, confirm: "Lift the ban and refund the entry?" })}>
                          Accept (lift + refund)
                        </Btn>
                        <Btn busy={busy} k={`d${b.id}`} className="btn-ghost btn-sm" onClick={() => run(`d${b.id}`, () => api<Msg>(`/admin/ban-appeals/${b.id}`, { body: { decision: "deny" } }), inv)}>
                          Deny
                        </Btn>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-2 font-semibold">Result appeals ({d.resultAppeals.length})</h2>
              {d.resultAppeals.length === 0 ? (
                <p className="text-sm text-muted">No pending result appeals.</p>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {d.resultAppeals.map((s) => (
                    <div key={s.id} className="card space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/players/${s.user.id}`} className="font-semibold hover:text-brand-2">
                          {s.user.name}
                        </Link>
                        {s.match && (
                          <Link to={`/matches/${s.match.id}`} className="text-xs text-muted underline">
                            {s.match.title}
                          </Link>
                        )}
                      </div>
                      <p className="text-sm">
                        Claimed #{s.placement}, {s.kills} kills. Rejected because: <span className="text-muted">{s.reviewNote}</span>
                      </p>
                      <div className="rounded-lg border border-line bg-surface-2 p-2 text-sm">“{s.appealText}”</div>
                      <div className="flex gap-2">
                        <button className="btn-primary btn-sm" onClick={() => setResult(s)}>
                          Review
                        </button>
                        <Btn busy={busy} k={`rd${s.id}`} className="btn-ghost btn-sm" onClick={() => run(`rd${s.id}`, () => api<Msg>(`/admin/result-appeals/${s.id}`, { body: { decision: "deny" } }), inv)}>
                          Deny
                        </Btn>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <TableCard title="All bans">
              {d.recent.length === 0 ? (
                <p className="p-4 text-sm text-muted">No bans yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Player</th>
                      <th>Ban</th>
                      <th>By</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {d.recent.map((b) => (
                      <tr key={b.id}>
                        <td className="text-xs whitespace-nowrap">{fmtDateTime(b.createdAt)}</td>
                        <td className="text-xs">
                          <Link to={`/players/${b.user.id}`} className="font-semibold text-ink hover:text-brand-2">
                            {b.user.name}
                          </Link>
                          <span className="block text-muted">{b.user.phone}</span>
                        </td>
                        <td className="text-xs">
                          <Badge tone="bad">
                            {b.level}
                            {b.days ? ` ${b.days}d` : ""}
                          </Badge>
                          <span className="block">{b.reason}</span>
                          {b.match && <span className="block text-muted">{b.match}</span>}
                        </td>
                        <td className="text-xs">{b.issuedBy}</td>
                        <td>
                          <Badge tone={b.status === "ACTIVE" ? "bad" : "ok"}>{b.status === "ACTIVE" ? "Active" : "Lifted"}</Badge>
                          {b.appealStatus !== "NONE" && <span className="block text-[11px] text-muted">appeal {b.appealStatus.toLowerCase()}</span>}
                        </td>
                        <td className="text-right">
                          {b.status === "ACTIVE" && (
                            <Btn busy={busy} k={`r${b.id}`} onClick={() => run(`r${b.id}`, () => api<Msg>(`/admin/bans/${b.id}/reverse`, { body: {} }), { ...inv, confirm: "Lift this ban (and refund the entry if it was a match ban)?" })}>
                              Lift
                            </Btn>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <Pager page={d.recentPage.page} total={d.recentPage.total} limit={d.recentPage.limit} onPage={setPage} />
            </TableCard>

            {isOwner && <Reasons reasons={d.reasons} path={path} />}
          </div>
        )}
      </Load>
      <ResultAppealModal s={result} onClose={() => setResult(null)} path={path} />
    </>
  );
}

function Reasons({ reasons, path }: { reasons: D["reasons"]; path: string }) {
  const { run, busy } = useAction();
  const [label, setLabel] = useState("");
  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Ban reasons (managers choose from these)</h2>
      <div className="flex flex-wrap gap-2">
        {reasons.map((r) => (
          <button
            key={r.id}
            onClick={() => run(r.id, () => api<Msg>("/admin/ban-reasons", { body: { op: "toggle", id: r.id } }), { invalidate: [[path]] })}
            className={`chip ${r.isActive ? "border-line text-ink" : "border-line text-muted line-through"}`}
            title={r.isActive ? "Click to disable" : "Click to enable"}
          >
            {r.label}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run("add", () => api<Msg>("/admin/ban-reasons", { body: { op: "add", label } }), { invalidate: [[path]] }).then((r) => r && setLabel(""));
        }}
      >
        <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="New reason" maxLength={120} required />
        <Btn busy={busy} k="add" type="submit" className="btn-primary">
          Add
        </Btn>
      </form>
    </div>
  );
}

function ResultAppealModal({ s, onClose, path }: { s: ResultAppeal | null; onClose: () => void; path: string }) {
  const { run, busy } = useAction();
  const [vals, setVals] = useState<{ id: string; kills: number; placement: number; claims: number[]; note: string } | null>(null);
  if (!s || !s.match) return null;
  const v = vals?.id === s.id ? vals : { id: s.id, kills: s.kills, placement: s.placement, claims: s.claims, note: "" };
  const set = (patch: Partial<typeof v>) => setVals({ ...v, ...patch });
  const preview = computePrize(s.match.rewards, v);
  return (
    <Modal open onClose={onClose} title={`Result appeal: ${s.user.name}`} wide>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          {Array.from({ length: s.imageCount }, (_, i) => (
            <a key={i} href={apiUrl(`/staff/submissions/${s.id}/images/${i}`)} target="_blank" rel="noreferrer">
              <img src={apiUrl(`/staff/submissions/${s.id}/images/${i}`)} alt="" className="w-full rounded-xl border border-line" />
            </a>
          ))}
          {s.imageCount === 0 && <p className="text-sm text-muted">No screenshots.</p>}
          {s.flags.map((f) => (
            <Notice key={f}>{f}</Notice>
          ))}
        </div>
        <div className="space-y-3">
          {s.match.status === "CANCELLED" && <Notice tone="bad">This match was cancelled and refunded; the appeal can only be denied.</Notice>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Position">
              <input className="input" type="number" min={1} max={100} value={v.placement} onChange={(e) => set({ placement: Number(e.target.value) })} />
            </Field>
            <Field label="Kills">
              <input className="input" type="number" min={0} max={300} value={v.kills} onChange={(e) => set({ kills: Number(e.target.value) })} />
            </Field>
          </div>
          {s.match.manualRuleIndexes.map((i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-[var(--color-brand)]" checked={v.claims.includes(i)} onChange={(e) => set({ claims: e.target.checked ? [...v.claims, i] : v.claims.filter((x) => x !== i) })} />
              {s.match!.rewards[i].label}
            </label>
          ))}
          <div className="rounded-xl border border-ok/40 bg-ok/10 p-3 text-sm">
            Prize if accepted: <b className="text-ok">{preview.total} tokens</b>
          </div>
          <Field label="Note (optional)">
            <input className="input" value={v.note} onChange={(e) => set({ note: e.target.value })} maxLength={200} />
          </Field>
          <div className="flex gap-2">
            <Btn
              busy={busy}
              k="acc"
              className="btn-primary flex-1"
              disabled={s.match.status === "CANCELLED"}
              onClick={() =>
                run("acc", () => api<Msg>(`/admin/result-appeals/${s.id}`, { body: { decision: "accept", kills: v.kills, placement: v.placement, claims: v.claims, note: v.note || undefined } }), {
                  invalidate: [[path], ["/admin/dashboard"]],
                }).then((r) => r && onClose())
              }
            >
              Accept & pay
            </Btn>
            <Btn
              busy={busy}
              k="den"
              className="btn-danger"
              onClick={() => run("den", () => api<Msg>(`/admin/result-appeals/${s.id}`, { body: { decision: "deny", note: v.note || undefined } }), { invalidate: [[path]] }).then((r) => r && onClose())}
            >
              Deny
            </Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}
