import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useTitle } from "@/lib/hooks";
import { LEDGER_LABEL, bdt, fmtDateTime } from "@/lib/format";
import type { Msg } from "@/lib/types";
import { Btn, Load, Modal, TableCard, formObject, useGet } from "@/components/kit";
import { Badge, Field, Notice, PageTitle, Stat, Submit, statusTone } from "@/components/ui";

type D = {
  player: {
    id: string; name: string; phone: string; status: string; suspendedUntil: string | null; depositTokens: number; winningTokens: number; referralCode: string | null;
    referredBy: { id: string; name: string; phone: string } | null; invited: number; mustChangePassword: boolean; createdAt: string; lastLoginAt: string | null;
  };
  profiles: { gameId: string; gameName: string; playerIdLabel: string; inGameId: string; inGameName: string; verified: boolean }[];
  ledger: { id: string; type: string; bucket: string; amount: number; balanceAfter: number; note: string | null; createdAt: string }[];
  bookings: { id: string; status: string; paid: number; match: { id: string; title: string; status: string; startAt: string; game: string } | null }[];
  bans: { id: string; level: string; reason: string; status: string; appealStatus: string; createdAt: string; issuedBy: string }[];
  deposits: { id: string; method: string; amountBdt: number; trxId: string; status: string; createdAt: string }[];
  withdrawals: { id: string; method: string; amountBdt: number; tokens: number; status: string; createdAt: string }[];
};

export default function PlayerDetailPage() {
  const { id = "" } = useParams();
  const path = `/admin/players/${id}`;
  const q = useGet<D>(path);
  useTitle(q.data?.player.name ?? "Player");
  return (
    <>
      <Link to="/players" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Players
      </Link>
      <Load q={q}>{(d) => <Detail d={d} path={path} />}</Load>
    </>
  );
}

function Detail({ d, path }: { d: D; path: string }) {
  const { isOwner } = useAuth();
  const { run, busy } = useAction();
  const [modal, setModal] = useState<null | "ban" | "reset" | "adjust">(null);
  const p = d.player;
  const act = (op: string, body: Record<string, unknown> = {}, confirm?: string) =>
    run(op, () => api<Msg>(`/admin/players/${p.id}/action`, { body: { op, ...body } }), { invalidate: [[path]], confirm }).then((r) => {
      if (r) setModal(null);
      return r;
    });

  return (
    <div className="space-y-4">
      <PageTitle
        title={p.name}
        sub={`${p.phone} · joined ${fmtDateTime(p.createdAt)} · last login ${fmtDateTime(p.lastLoginAt)}`}
        right={<Badge tone={p.status === "ACTIVE" ? "ok" : statusTone(p.status === "SUSPENDED" ? "PENDING" : "BANNED")}>{p.status}</Badge>}
      />
      {p.status === "SUSPENDED" && p.suspendedUntil && <Notice>Suspended until {fmtDateTime(p.suspendedUntil)}.</Notice>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Deposit tokens" value={p.depositTokens} />
        <Stat label="Winnings" value={p.winningTokens} accent />
        <Stat label="Referral code" value={p.referralCode ?? "—"} hint={`${p.invited} invited`} />
        <Stat label="Invited by" value={p.referredBy ? <Link to={`/players/${p.referredBy.id}`} className="hover:text-brand-2">{p.referredBy.name}</Link> : "—"} />
      </div>

      <div className="flex flex-wrap gap-2">
        {p.status === "BANNED" || p.status === "SUSPENDED" ? (
          <Btn busy={busy} k="unban" className="btn-primary btn-sm" onClick={() => act("unban", {}, "Make this account active again?")}>
            Unban / unsuspend
          </Btn>
        ) : (
          <button className="btn-danger btn-sm" onClick={() => setModal("ban")}>
            Ban permanently
          </button>
        )}
        <button className="btn-ghost btn-sm" onClick={() => setModal("reset")}>
          Reset password
        </button>
        {isOwner && (
          <button className="btn-ghost btn-sm" onClick={() => setModal("adjust")}>
            Adjust balance
          </button>
        )}
      </div>

      <TableCard title="Game IDs">
        {d.profiles.length === 0 ? (
          <p className="p-4 text-sm text-muted">No game IDs added.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Game</th>
                <th>ID</th>
                <th>In-game name</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {d.profiles.map((g) => (
                <tr key={g.gameId}>
                  <td>{g.gameName}</td>
                  <td className="font-mono">
                    {g.inGameId} {g.verified && <BadgeCheck className="inline h-3.5 w-3.5 text-ok" />}
                  </td>
                  <td>{g.inGameName}</td>
                  <td className="space-x-1 text-right whitespace-nowrap">
                    <Btn busy={busy} k={`v${g.gameId}`} onClick={() => act(g.verified ? "unverify-profile" : "verify-profile", { gameId: g.gameId })}>
                      {g.verified ? "Unverify" : "Verify"}
                    </Btn>
                    <EditProfile g={g} onSave={(body) => act("set-profile", { gameId: g.gameId, ...body })} busy={busy === "set-profile"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <TableCard title="Recent matches">
          <table className="table">
            <tbody>
              {d.bookings.length === 0 && (
                <tr>
                  <td className="text-muted">No matches.</td>
                </tr>
              )}
              {d.bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    {b.match ? (
                      <Link to={`/matches/${b.match.id}`} className="hover:text-brand-2">
                        {b.match.title}
                      </Link>
                    ) : (
                      "—"
                    )}
                    <span className="block text-[11px] text-muted">
                      {b.match?.game} · {fmtDateTime(b.match?.startAt)}
                    </span>
                  </td>
                  <td className="text-right">{b.paid}</td>
                  <td>
                    <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
        <TableCard title="Bans">
          <table className="table">
            <tbody>
              {d.bans.length === 0 && (
                <tr>
                  <td className="text-muted">No bans.</td>
                </tr>
              )}
              {d.bans.map((b) => (
                <tr key={b.id}>
                  <td className="text-xs">{fmtDateTime(b.createdAt)}</td>
                  <td className="text-xs">
                    {b.level}: {b.reason}
                    <span className="block text-muted">by {b.issuedBy}</span>
                  </td>
                  <td>
                    <Badge tone={b.status === "ACTIVE" ? "bad" : "ok"}>{b.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
        <TableCard title="Deposits & withdrawals">
          <table className="table">
            <tbody>
              {d.deposits.map((x) => (
                <tr key={x.id}>
                  <td className="text-xs">{fmtDateTime(x.createdAt)}</td>
                  <td className="text-xs">
                    Deposit {bdt(x.amountBdt)} · {x.method} <span className="font-mono">{x.trxId}</span>
                  </td>
                  <td>
                    <Badge tone={statusTone(x.status)}>{x.status}</Badge>
                  </td>
                </tr>
              ))}
              {d.withdrawals.map((x) => (
                <tr key={x.id}>
                  <td className="text-xs">{fmtDateTime(x.createdAt)}</td>
                  <td className="text-xs">
                    Withdraw {x.tokens} → {bdt(x.amountBdt)} · {x.method}
                  </td>
                  <td>
                    <Badge tone={statusTone(x.status)}>{x.status}</Badge>
                  </td>
                </tr>
              ))}
              {d.deposits.length + d.withdrawals.length === 0 && (
                <tr>
                  <td className="text-muted">None.</td>
                </tr>
              )}
            </tbody>
          </table>
        </TableCard>
        <TableCard title="Ledger (last 40)">
          <table className="table">
            <tbody>
              {d.ledger.map((l) => (
                <tr key={l.id}>
                  <td className="text-xs whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                  <td className="text-xs">
                    {LEDGER_LABEL[l.type] ?? l.type} <span className="text-muted">({l.bucket.toLowerCase()})</span>
                    {l.note && <span className="block text-muted">{l.note}</span>}
                  </td>
                  <td className={`text-right font-semibold ${l.amount > 0 ? "text-ok" : "text-bad"}`}>
                    {l.amount > 0 ? "+" : ""}
                    {l.amount}
                  </td>
                  <td className="text-right text-xs text-muted">{l.balanceAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>

      <Modal open={modal === "ban"} onClose={() => setModal(null)} title="Ban permanently">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); act("ban", formObject(e.currentTarget)); }}>
          <p className="text-sm text-muted">The player can still log in to see the ban and appeal it, but cannot join, deposit or withdraw.</p>
          <Field label="Reason">
            <input className="input" name="reason" required minLength={3} maxLength={200} />
          </Field>
          <Submit busy={busy === "ban"} className="btn-danger w-full">Ban player</Submit>
        </form>
      </Modal>
      <Modal open={modal === "reset"} onClose={() => setModal(null)} title="Reset password">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); act("reset-password", formObject(e.currentTarget)); }}>
          <p className="text-sm text-muted">Give the player this temporary password (by phone). They must choose a new one after logging in. All their sessions are logged out.</p>
          <Field label="Temporary password (8+ characters)">
            <input className="input" name="password" required minLength={8} autoComplete="off" />
          </Field>
          <Submit busy={busy === "reset-password"}>Set temporary password</Submit>
        </form>
      </Modal>
      <Modal open={modal === "adjust"} onClose={() => setModal(null)} title="Adjust balance (Super Admin)">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = formObject(e.currentTarget);
            act("adjust", { bucket: f.bucket, amount: Number(f.amount), note: f.note }, `Change ${f.bucket.toLowerCase()} balance by ${f.amount}?`);
          }}
        >
          <p className="text-sm text-muted">Use a negative number to remove tokens. Every adjustment is recorded in the ledger and audit log.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Balance">
              <select className="input" name="bucket">
                <option value="DEPOSIT">Deposit tokens</option>
                <option value="WINNINGS">Winnings</option>
              </select>
            </Field>
            <Field label="Amount (+ / −)">
              <input className="input" name="amount" type="number" required />
            </Field>
          </div>
          <Field label="Reason">
            <input className="input" name="note" required minLength={3} maxLength={200} />
          </Field>
          <Submit busy={busy === "adjust"}>Save adjustment</Submit>
        </form>
      </Modal>
    </div>
  );
}

function EditProfile({ g, onSave, busy }: { g: D["profiles"][number]; onSave: (b: { inGameId: string; inGameName: string }) => Promise<unknown>; busy: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Edit
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Edit ${g.gameName} ID`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = formObject(e.currentTarget);
            onSave({ inGameId: f.inGameId, inGameName: f.inGameName }).then((r) => r && setOpen(false));
          }}
        >
          <Field label={g.playerIdLabel}>
            <input className="input font-mono" name="inGameId" defaultValue={g.inGameId} required />
          </Field>
          <Field label="In-game name">
            <input className="input" name="inGameName" defaultValue={g.inGameName} required minLength={2} />
          </Field>
          <Submit busy={busy}>Save</Submit>
        </form>
      </Modal>
    </>
  );
}
