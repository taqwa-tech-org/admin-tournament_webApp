import { useState } from "react";
import { Link, useParams } from "react-router";
import { AlertTriangle, ArrowLeft, BadgeCheck, Ban, Flag, ImageUp, KeyRound, Play, Square, Star, Trophy, XCircle } from "lucide-react";
import { api, apiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useTitle } from "@/lib/hooks";
import { fmtDateTime, fromLocalInput, toLocalInput } from "@/lib/format";
import { computePrize, describeRule } from "@/lib/prize";
import type { MatchCard, Msg } from "@/lib/types";
import { Btn, Load, Modal, TableCard, formObject, useGet } from "@/components/kit";
import { Badge, Banner, Field, MatchStatusBadge, Notice, PageTitle, Stat, Submit, Token, statusTone } from "@/components/ui";

type Booking = {
  id: string; slotNo: number; status: string; teamName: string | null; players: { name: string; inGameId: string }[]; paid: number;
  user: { id: string; name: string; phone: string }; profileVerified: boolean; duplicateId: boolean;
  submission: { id: string; status: string; kills: number; placement: number; prizeTokens: number } | null;
};
type Sub = {
  id: string; bookingId: string; slotNo: number | null; name: string; status: string; source: string; kills: number; placement: number; claims: number[];
  flags: string[]; imageCount: number; prizeTokens: number; prizeLines: string[]; reviewNote: string | null; appealText: string | null; createdAt: string;
};
type Detail = {
  match: MatchCard & { roomId: string | null; roomPassword: string; roomUpdatedAt: string | null; bannerUrl: string | null; mapImageUrl: string | null; commissionPct: number; managerSharePct: number; managerEarningBdt: number; cancelReason: string | null };
  money: { collected: number; forfeited: number; prizesPaid: number };
  manualRuleIndexes: number[];
  bookings: Booking[];
  submissions: Sub[];
  banReasons: string[];
  suspendMaxDays: number;
  roomRevealMinutes: number;
};

export default function MatchControlPage() {
  const { id = "" } = useParams();
  const path = `/staff/matches/${id}`;
  const q = useGet<Detail>(path, { refetchInterval: 20_000 });
  useTitle(q.data?.match.title ?? "Match");
  return (
    <>
      <Link to="/matches" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All matches
      </Link>
      <Load q={q}>{(d) => <Control d={d} path={path} />}</Load>
    </>
  );
}

function Control({ d, path }: { d: Detail; path: string }) {
  const { isAdmin } = useAuth();
  const { run, busy } = useAction();
  const m = d.match;
  const closed = m.status === "COMPLETED" || m.status === "CANCELLED";
  const inv = { invalidate: [[path]] };
  const late = m.status === "OPEN" && new Date(m.startAt) <= new Date();
  const underfilled = m.minEntries > 0 && m.booked < m.minEntries;
  const pending = d.submissions.filter((s) => s.status === "PENDING");
  const [cancelOpen, setCancelOpen] = useState(false);
  const setStatus = (status: string, confirm?: string, force?: boolean) =>
    run(status, () => api<Msg>(`${path}/status`, { body: { status, force } }), { ...inv, confirm });

  return (
    <>
      <PageTitle
        title={m.title}
        sub={`${m.game.name}${m.versionName ? ` (${m.versionName})` : ""} · ${m.modeName} · ${m.format}${m.mapName ? ` · ${m.mapName}` : ""} · ${fmtDateTime(m.startAt)}${m.manager ? ` · ${m.manager.name}` : ""}`}
        right={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Btn busy={busy} k="feature" onClick={() => run("feature", () => api<Msg>(`${path}/feature`, { body: {} }), inv)}>
                <Star className={`h-3.5 w-3.5 ${m.isFeatured ? "fill-brand-2 text-brand-2" : ""}`} /> {m.isFeatured ? "Featured" : "Feature"}
              </Btn>
            )}
            <MatchStatusBadge status={m.status} bookingOpen={m.bookingOpen} />
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={m.teamSize > 1 ? "Teams" : "Players"} value={`${m.booked}/${m.slots}`} hint={m.minEntries ? `minimum ${m.minEntries}` : undefined} />
        <Stat label="Entry" value={<Token value={m.entryPerTeam} />} hint={m.teamSize > 1 ? `${m.entryFee} × ${m.teamSize}` : undefined} />
        <Stat label="Collected" value={<Token value={d.money.collected} />} />
        <Stat label="Prizes paid" value={<Token value={d.money.prizesPaid} />} hint={d.money.prizesPaid > d.money.collected ? "More than collected!" : undefined} />
        <Stat label="Forfeited (bans)" value={<Token value={d.money.forfeited} />} />
        <Stat label="Your share" value={m.managerSharePct ? `${m.managerSharePct}% of ${m.commissionPct}%` : "—"} hint={m.status === "COMPLETED" ? `Earned ৳${m.managerEarningBdt}` : undefined} />
      </div>

      {m.status === "CANCELLED" && <Notice tone="bad" title="Cancelled">{m.cancelReason ?? "This match was cancelled. All active entries were refunded."}</Notice>}
      {late && (
        <div className="mb-4">
          <Notice title="Start time has passed">Players can no longer join. Start the match now, or set a new time below.</Notice>
        </div>
      )}
      {m.status === "OPEN" && underfilled && (
        <div className="mb-4">
          <Notice title={`Below minimum (${m.booked}/${m.minEntries})`}>If the minimum is not reached by the start time, the match is cancelled and refunded automatically.</Notice>
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run("room", () => api<Msg>(`${path}/room`, { method: "PUT", body: formObject(e.currentTarget) }), inv);
          }}
        >
          <h2 className="flex items-center gap-2 font-semibold">
            <KeyRound className="h-4 w-4 text-brand-2" /> Custom room
          </h2>
          <p className="text-xs text-muted">Create the room in the game, then save it here. Joined players see it {d.roomRevealMinutes} minutes before the start (and get a notification).</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Room ID">
              <input className="input font-mono" name="roomId" defaultValue={m.roomId ?? ""} required disabled={closed} maxLength={40} />
            </Field>
            <Field label="Password">
              <input className="input font-mono" name="password" defaultValue={m.roomPassword} required disabled={closed} maxLength={40} />
            </Field>
          </div>
          {!closed && (
            <Btn busy={busy} k="room" type="submit" className="btn-primary">
              {m.roomId ? "Update room (if the password leaked)" : "Save room"}
            </Btn>
          )}
          {m.roomUpdatedAt && <p className="text-xs text-muted">Last updated {fmtDateTime(m.roomUpdatedAt)}</p>}
        </form>

        <div className="card space-y-3">
          <h2 className="font-semibold">Match status</h2>
          <div className="flex flex-wrap gap-2">
            {m.status === "OPEN" && (
              <>
                <Btn busy={busy} k="LIVE" className="btn-primary" onClick={() => setStatus("LIVE", "Start the match? Booking closes for everyone.")}>
                  <Play className="h-4 w-4" /> Start match
                </Btn>
                {isAdmin && underfilled && (
                  <Btn busy={busy} k="LIVE" className="btn-ghost" onClick={() => setStatus("LIVE", `Only ${m.booked} of ${m.minEntries} entries. Prizes may cost more than the fees. Force start?`, true)}>
                    Force start (admin)
                  </Btn>
                )}
              </>
            )}
            {m.status === "LIVE" && (
              <Btn busy={busy} k="REVIEW" className="btn-primary" onClick={() => setStatus("REVIEW")}>
                <Square className="h-4 w-4" /> Match ended → review results
              </Btn>
            )}
            {m.status === "REVIEW" && (
              <>
                <Btn
                  busy={busy}
                  k="COMPLETED"
                  className="btn-primary"
                  disabled={pending.length > 0}
                  onClick={() => setStatus("COMPLETED", "Complete the match? Results become final (appeals still possible).")}
                >
                  <Trophy className="h-4 w-4" /> Complete match
                </Btn>
                <Btn busy={busy} k="LIVE" onClick={() => setStatus("LIVE")}>
                  Back to live
                </Btn>
              </>
            )}
            {(m.status === "OPEN" || m.status === "LIVE") && (
              <button className="btn-danger" onClick={() => setCancelOpen(true)}>
                <XCircle className="h-4 w-4" /> Cancel & refund
              </button>
            )}
            {closed && <p className="text-sm text-muted">This match is {m.status.toLowerCase()}.</p>}
          </div>
          {m.status === "REVIEW" && pending.length > 0 && <p className="text-xs text-warn">Review {pending.length} pending result(s) before completing.</p>}
          {m.status === "OPEN" && (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = String(new FormData(e.currentTarget).get("startAt"));
                run("resched", () => api<Msg>(`${path}/reschedule`, { body: { startAt: fromLocalInput(v) } }), inv);
              }}
            >
              <Field label="New start time (Bangladesh)">
                <input className="input py-1.5" type="datetime-local" name="startAt" required defaultValue={toLocalInput(new Date(Math.max(Date.now() + 3600_000, new Date(m.startAt).getTime())))} />
              </Field>
              <Btn busy={busy} k="resched" type="submit">
                Reschedule
              </Btn>
            </form>
          )}
          <div className="border-t border-line pt-3">
            <h3 className="mb-1 text-xs font-semibold text-muted">Prize rules</h3>
            <ul className="space-y-0.5 text-xs">
              {m.rewards.map((r, i) => (
                <li key={i}>
                  • <b>{r.label}</b>: {describeRule(r)}
                </li>
              ))}
            </ul>
            {m.rulesText && <p className="mt-2 text-xs whitespace-pre-line text-muted">{m.rulesText}</p>}
          </div>
        </div>
      </div>

      <BannerCard d={d} path={path} />
      <ResultsSection d={d} path={path} />
      <EntriesSection d={d} path={path} />

      <CancelModal open={cancelOpen} onClose={() => setCancelOpen(false)} path={path} />
    </>
  );
}

function CancelModal({ open, onClose, path }: { open: boolean; onClose: () => void; path: string }) {
  const { run, busy } = useAction();
  return (
    <Modal open={open} onClose={onClose} title="Cancel match and refund everyone">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const reason = String(new FormData(e.currentTarget).get("reason"));
          run("cancel", () => api<Msg>(`${path}/status`, { body: { status: "CANCELLED", reason } }), { invalidate: [[path]] }).then((r) => r && onClose());
        }}
      >
        <p className="text-sm text-muted">Every active entry gets its full fee back and players are notified. This cannot be undone.</p>
        <Field label="Reason (shown to players)">
          <input className="input" name="reason" required maxLength={200} placeholder="e.g. Game server problem" />
        </Field>
        <Submit busy={busy === "cancel"} className="btn-danger w-full">
          Cancel match
        </Submit>
      </form>
    </Modal>
  );
}

function BannerCard({ d, path }: { d: Detail; path: string }) {
  const { run, busy } = useAction();
  const m = d.match;
  const upload = (file: File | undefined) => {
    if (!file) return;
    const form = new FormData();
    form.set("image", file);
    run("banner", () => api<Msg>(`${path}/banner`, { form }), { invalidate: [[path]] });
  };
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-line bg-surface md:flex">
      <div className="relative h-36 md:h-auto md:w-72 md:shrink-0">
        <Banner src={m.bannerUrl ?? m.mapImageUrl} name={m.mapName ?? m.modeName} />
      </div>
      <div className="flex-1 space-y-2 p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <ImageUp className="h-4 w-4 text-brand-2" /> Banner picture
        </h2>
        <p className="text-xs text-muted">Shown on the match card. Without a banner, the map picture is used. JPG/PNG/WEBP, max 3 MB, wide images look best.</p>
        <div className="flex flex-wrap gap-2">
          <label className="btn-ghost btn-sm cursor-pointer">
            {busy === "banner" ? "Uploading…" : "Upload banner"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          {m.bannerUrl && (
            <Btn busy={busy} k="rm" onClick={() => run("rm", () => api<Msg>(`${path}/banner`, { body: { remove: "1" } }), { invalidate: [[path]] })}>
              Remove banner
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Results ---------------- */

function ResultsSection({ d, path }: { d: Detail; path: string }) {
  const m = d.match;
  const [review, setReview] = useState<Sub | null>(null);
  const canEnter = ["LIVE", "REVIEW", "COMPLETED"].includes(m.status);
  const subs = [...d.submissions].sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING") || a.placement - b.placement);
  return (
    <>
      {subs.length > 0 && (
        <TableCard title="Results">
          <table className="table">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Entry</th>
                <th>Result</th>
                <th>Flags</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td>#{s.slotNo ?? "?"}</td>
                  <td>
                    {s.name}
                    <span className="block text-[11px] text-muted">{s.source === "STAFF" ? "entered by staff" : `${s.imageCount} screenshot(s)`}</span>
                  </td>
                  <td>
                    #{s.placement} · {s.kills} kills
                    {s.status === "APPROVED" && <span className="block text-xs text-ok">+{s.prizeTokens} tokens</span>}
                  </td>
                  <td className="max-w-[220px] text-xs">
                    {s.flags.length ? (
                      s.flags.map((f) => (
                        <span key={f} className="mb-0.5 flex items-center gap-1 text-warn">
                          <Flag className="h-3 w-3" /> {f}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                  </td>
                  <td className="text-right">
                    {s.status === "PENDING" && (
                      <button className="btn-primary btn-sm" onClick={() => setReview(s)}>
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
      {canEnter && <BulkResults d={d} path={path} />}
      <ReviewModal sub={review} d={d} path={path} onClose={() => setReview(null)} />
    </>
  );
}

function ReviewModal({ sub, d, path, onClose }: { sub: Sub | null; d: Detail; path: string; onClose: () => void }) {
  const { run, busy } = useAction();
  const [kills, setKills] = useState(0);
  const [placement, setPlacement] = useState(1);
  const [claims, setClaims] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (sub && loadedFor !== sub.id) {
    setLoadedFor(sub.id);
    setKills(sub.kills);
    setPlacement(sub.placement);
    setClaims(sub.claims);
    setNote("");
  }
  if (!sub) return null;
  const preview = computePrize(d.match.rewards, { kills, placement, claims });
  const decide = (decision: "approve" | "reject") =>
    run(decision, () => api<Msg>(`/staff/submissions/${sub.id}/review`, { body: { decision, kills, placement, claims, note: note || undefined } }), { invalidate: [[path]] }).then(
      (r) => r && onClose(),
    );
  return (
    <Modal open onClose={onClose} title={`Review result: ${sub.name} (slot #${sub.slotNo})`} wide>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          {Array.from({ length: sub.imageCount }, (_, i) => (
            <a key={i} href={apiUrl(`/staff/submissions/${sub.id}/images/${i}`)} target="_blank" rel="noreferrer">
              <img src={apiUrl(`/staff/submissions/${sub.id}/images/${i}`)} alt={`Screenshot ${i + 1}`} className="w-full rounded-xl border border-line" />
            </a>
          ))}
          {sub.flags.map((f) => (
            <Notice key={f}>{f}</Notice>
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Player claimed: #{sub.placement}, {sub.kills} kills. Check the screenshot and correct the numbers if needed.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Position">
              <input className="input" type="number" min={1} max={100} value={placement} onChange={(e) => setPlacement(Number(e.target.value))} />
            </Field>
            <Field label="Kills">
              <input className="input" type="number" min={0} max={300} value={kills} onChange={(e) => setKills(Number(e.target.value))} />
            </Field>
          </div>
          {d.manualRuleIndexes.map((i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-[var(--color-brand)]" checked={claims.includes(i)} onChange={(e) => setClaims((c) => (e.target.checked ? [...c, i] : c.filter((x) => x !== i)))} />
              {d.match.rewards[i].label} ({d.match.rewards[i].condition})
            </label>
          ))}
          <div className="rounded-xl border border-ok/40 bg-ok/10 p-3">
            <div className="font-semibold text-ok">Prize: {preview.total} tokens</div>
            <div className="text-xs text-muted">{preview.lines.join(" · ") || "No prize for this result"}</div>
          </div>
          <Field label="Note (required to reject; shown to the player)">
            <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </Field>
          <div className="flex gap-2">
            <Btn busy={busy} k="approve" className="btn-primary flex-1" onClick={() => decide("approve")}>
              Approve & pay
            </Btn>
            <Btn busy={busy} k="reject" className="btn-danger" onClick={() => decide("reject")} disabled={!note.trim()}>
              Reject
            </Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Enter results for several entries at once, from the in-game scoreboard. */
function BulkResults({ d, path }: { d: Detail; path: string }) {
  const { run, busy } = useAction();
  const open = d.bookings.filter((b) => (b.status === "BOOKED" || b.status === "COMPLETED") && !b.submission);
  const [rows, setRows] = useState<Record<string, { placement: string; kills: string; claims: number[] }>>({});
  const [proof, setProof] = useState<File | null>(null);
  if (open.length === 0) return null;
  const set = (id: string, patch: Partial<{ placement: string; kills: string; claims: number[] }>) =>
    setRows((r) => ({ ...r, [id]: { ...(r[id] ?? { placement: "", kills: "", claims: [] }), ...patch } }));
  const filled = Object.entries(rows).filter(([, v]) => v.placement);
  const save = () => {
    const form = new FormData();
    form.set("rows", JSON.stringify(filled.map(([bookingId, v]) => ({ bookingId, placement: Number(v.placement), kills: Number(v.kills || 0), claims: v.claims }))));
    if (proof) form.set("proof", proof);
    run("bulk", () => api<Msg>(`${path}/results`, { form }), { invalidate: [[path]], confirm: `Save ${filled.length} result(s) and pay the prizes now?` }).then((r) => {
      if (r) {
        setRows({});
        setProof(null);
      }
    });
  };
  return (
    <TableCard
      title="Enter results from the scoreboard"
      right={<span className="text-xs text-muted">{open.length} entries without a result. Fill only the ones you want to save.</span>}
    >
      <table className="table">
        <thead>
          <tr>
            <th>Slot</th>
            <th>Entry</th>
            <th className="w-24">Position</th>
            <th className="w-24">Kills</th>
            {d.manualRuleIndexes.length > 0 && <th>Special</th>}
            <th className="text-right">Prize</th>
          </tr>
        </thead>
        <tbody>
          {open.map((b) => {
            const v = rows[b.id] ?? { placement: "", kills: "", claims: [] };
            const prize = v.placement ? computePrize(d.match.rewards, { placement: Number(v.placement), kills: Number(v.kills || 0), claims: v.claims }).total : null;
            return (
              <tr key={b.id}>
                <td>#{b.slotNo}</td>
                <td>
                  {b.teamName ?? b.players[0]?.name}
                  <span className="block text-[11px] text-muted">{b.players.map((p) => p.inGameId).join(", ")}</span>
                </td>
                <td>
                  <input className="input py-1" type="number" min={1} max={100} value={v.placement} onChange={(e) => set(b.id, { placement: e.target.value })} />
                </td>
                <td>
                  <input className="input py-1" type="number" min={0} max={300} value={v.kills} onChange={(e) => set(b.id, { kills: e.target.value })} />
                </td>
                {d.manualRuleIndexes.length > 0 && (
                  <td className="text-xs">
                    {d.manualRuleIndexes.map((i) => (
                      <label key={i} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          className="accent-[var(--color-brand)]"
                          checked={v.claims.includes(i)}
                          onChange={(e) => set(b.id, { claims: e.target.checked ? [...v.claims, i] : v.claims.filter((x) => x !== i) })}
                        />
                        {d.match.rewards[i].label}
                      </label>
                    ))}
                  </td>
                )}
                <td className="text-right font-semibold text-brand-2">{prize ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <label className="text-xs text-muted">
          Scoreboard screenshot (optional):{" "}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setProof(e.target.files?.[0] ?? null)} className="text-xs" />
        </label>
        <Btn busy={busy} k="bulk" className="btn-primary" disabled={filled.length === 0} onClick={save}>
          Save {filled.length || ""} result(s) & pay
        </Btn>
      </div>
    </TableCard>
  );
}

/* ---------------- Entries ---------------- */

function EntriesSection({ d, path }: { d: Detail; path: string }) {
  const { run, busy } = useAction();
  const [ban, setBan] = useState<Booking | null>(null);
  const closed = d.match.status === "COMPLETED" || d.match.status === "CANCELLED";
  return (
    <div className="mt-4">
      <TableCard title={`Entries (${d.bookings.length})`}>
        {d.bookings.length === 0 ? (
          <p className="p-4 text-sm text-muted">Nobody has joined yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Team / players</th>
                <th>Account</th>
                <th>Paid</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {d.bookings.map((b) => (
                <tr key={b.id}>
                  <td className="font-bold">#{b.slotNo}</td>
                  <td>
                    {b.teamName && <span className="font-semibold">{b.teamName}</span>}
                    {b.players.map((p, i) => (
                      <span key={i} className="block text-xs">
                        {p.name} <span className="font-mono text-muted">{p.inGameId}</span>
                        {i === 0 && b.profileVerified && <BadgeCheck className="ml-1 inline h-3 w-3 text-ok" />}
                      </span>
                    ))}
                    {b.duplicateId && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-bad">
                        <AlertTriangle className="h-3 w-3" /> Player ID also used by another entry
                      </span>
                    )}
                  </td>
                  <td className="text-xs">
                    {b.user.name}
                    <span className="block text-muted">{b.user.phone}</span>
                  </td>
                  <td>{b.paid}</td>
                  <td>
                    <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                    {b.submission && <span className="block text-[11px] text-muted">result {b.submission.status.toLowerCase()}</span>}
                  </td>
                  <td className="space-x-1 text-right whitespace-nowrap">
                    {!b.profileVerified && b.status !== "REFUNDED" && (
                      <Btn busy={busy} k={`v${b.id}`} onClick={() => run(`v${b.id}`, () => api<Msg>(`${path}/verify-profile`, { body: { userId: b.user.id } }), { invalidate: [[path]] })}>
                        Verify ID
                      </Btn>
                    )}
                    {b.status === "BOOKED" && !closed && (
                      <button className="btn-ghost btn-sm text-bad" onClick={() => setBan(b)}>
                        <Ban className="h-3.5 w-3.5" /> Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
      <BanModal booking={ban} d={d} path={path} onClose={() => setBan(null)} />
    </div>
  );
}

function BanModal({ booking, d, path, onClose }: { booking: Booking | null; d: Detail; path: string; onClose: () => void }) {
  const { run, busy } = useAction();
  const [level, setLevel] = useState<"MATCH" | "SUSPEND">("MATCH");
  if (!booking) return null;
  return (
    <Modal open onClose={onClose} title={`Ban slot #${booking.slotNo}: ${booking.teamName ?? booking.players[0]?.name}`}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = formObject(e.currentTarget);
          run("ban", () => api<Msg>(`${path}/ban`, { body: { bookingId: booking.id, reason: f.reason, note: f.note || undefined, level, days: level === "SUSPEND" ? Number(f.days) : undefined } }), {
            invalidate: [[path]],
          }).then((r) => r && onClose());
        }}
      >
        <p className="text-sm text-muted">The entry fee ({booking.paid} tokens) is forfeited and any pending result is rejected. The player can appeal once.</p>
        <Field label="Reason">
          <select className="input" name="reason" required>
            {d.banReasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Note (optional, shown to the player)">
          <input className="input" name="note" maxLength={300} />
        </Field>
        <div className="flex gap-2">
          {(["MATCH", "SUSPEND"] as const).map((l) => (
            <button type="button" key={l} onClick={() => setLevel(l)} className={`chip ${level === l ? "border-bad bg-bad/15 text-bad" : "border-line text-muted"}`}>
              {l === "MATCH" ? "This match only" : "Also suspend account"}
            </button>
          ))}
        </div>
        {level === "SUSPEND" && (
          <Field label={`Suspension days (max ${d.suspendMaxDays})`}>
            <input className="input" name="days" type="number" min={1} max={d.suspendMaxDays} defaultValue={1} required />
          </Field>
        )}
        <Submit busy={busy === "ban"} className="btn-danger w-full">
          Ban entry
        </Submit>
      </form>
    </Modal>
  );
}
