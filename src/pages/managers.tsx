import { useState } from "react";
import { Link } from "react-router";
import { UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useTitle } from "@/lib/hooks";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { Msg } from "@/lib/types";
import { Btn, Load, Modal, TableCard, formObject, useGet } from "@/components/kit";
import { Badge, Empty, Field, PageTitle, Submit } from "@/components/ui";

type M = {
  id: string; name: string; phone: string; status: string; mustChangePassword: boolean; lastLoginAt: string | null; createdAt: string; sharePct: number | null;
  matches: number; activeMatches: number; bansIssued: number; bansReversed: number;
};

export default function ManagersPage() {
  useTitle("Managers");
  const { isOwner } = useAuth();
  const path = "/admin/managers";
  const q = useGet<{ managers: M[] }>(path);
  const { run, busy } = useAction();
  const [modal, setModal] = useState<null | "add" | "promote" | { reset: M }>(null);
  const inv = { invalidate: [[path]] };
  const act = (m: M, op: string, confirm?: string, extra: Record<string, unknown> = {}) =>
    run(`${op}${m.id}`, () => api<Msg>(`/admin/managers/${m.id}/action`, { body: { op, ...extra } }), { ...inv, confirm });

  return (
    <>
      <PageTitle
        title="Managers"
        sub="Managers create matches, run rooms and check results. A high reversed-ban count is a warning sign."
        right={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setModal("promote")}>
              Promote a player
            </button>
            <button className="btn-primary" onClick={() => setModal("add")}>
              <UserPlus className="h-4 w-4" /> Add manager
            </button>
          </div>
        }
      />
      <Load q={q}>
        {(d) =>
          d.managers.length === 0 ? (
            <Empty title="No managers yet" />
          ) : (
            <TableCard>
              <table className="table">
                <thead>
                  <tr>
                    <th>Manager</th>
                    <th className="text-right">Matches</th>
                    <th className="text-right">Bans (reversed)</th>
                    <th>Share</th>
                    <th>Last login</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.managers.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link to={`/earnings/${m.id}`} className="font-semibold hover:text-brand-2">
                          {m.name}
                        </Link>
                        <span className="block text-xs text-muted">
                          {m.phone} · since {fmtDate(m.createdAt)}
                        </span>
                      </td>
                      <td className="text-right">
                        {m.matches}
                        {m.activeMatches > 0 && <span className="block text-[11px] text-muted">{m.activeMatches} active</span>}
                      </td>
                      <td className={`text-right ${m.bansReversed > 2 ? "text-warn" : ""}`}>
                        {m.bansIssued} ({m.bansReversed})
                      </td>
                      <td>{m.sharePct === null ? <span className="text-muted">default</span> : `${m.sharePct}%`}</td>
                      <td className="text-xs">{fmtDateTime(m.lastLoginAt)}</td>
                      <td>
                        <Badge tone={m.status === "ACTIVE" ? "ok" : "bad"}>{m.status}</Badge>
                        {m.mustChangePassword && <span className="block text-[11px] text-muted">first login pending</span>}
                      </td>
                      <td className="space-x-1 text-right whitespace-nowrap">
                        {m.status === "ACTIVE" ? (
                          <Btn busy={busy} k={`block${m.id}`} onClick={() => act(m, "block", `Block ${m.name}? They are logged out immediately.`)}>
                            Block
                          </Btn>
                        ) : (
                          <Btn busy={busy} k={`unblock${m.id}`} onClick={() => act(m, "unblock")}>
                            Unblock
                          </Btn>
                        )}
                        <button className="btn-ghost btn-sm" onClick={() => setModal({ reset: m })}>
                          Reset password
                        </button>
                        <Btn busy={busy} k={`demote${m.id}`} onClick={() => act(m, "demote", `Make ${m.name} a normal player again?`)}>
                          Demote
                        </Btn>
                        {isOwner && (
                          <Btn busy={busy} k={`delete${m.id}`} className="btn-ghost btn-sm text-bad" onClick={() => act(m, "delete", `Delete ${m.name}? Their history is kept, the account is closed.`)}>
                            Delete
                          </Btn>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          )
        }
      </Load>

      <Modal open={modal === "add"} onClose={() => setModal(null)} title="Add manager">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run("add", () => api<Msg>("/admin/managers", { body: formObject(e.currentTarget) }), inv).then((r) => r && setModal(null));
          }}
        >
          <Field label="Name">
            <input className="input" name="name" required minLength={2} />
          </Field>
          <Field label="Mobile number">
            <input className="input" name="phone" required placeholder="01XXXXXXXXX" />
          </Field>
          <Field label="Temporary password (10+ characters)" hint="They must change it at first login.">
            <input className="input" name="password" required minLength={10} autoComplete="off" />
          </Field>
          <Submit busy={busy === "add"}>Add manager</Submit>
        </form>
      </Modal>
      <Modal open={modal === "promote"} onClose={() => setModal(null)} title="Promote a player to manager">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run("promote", () => api<Msg>("/admin/managers/promote", { body: formObject(e.currentTarget) }), inv).then((r) => r && setModal(null));
          }}
        >
          <p className="text-sm text-muted">The player keeps their password. Their wallet must be empty (staff cannot play or withdraw).</p>
          <Field label="Player's mobile number">
            <input className="input" name="phone" required placeholder="01XXXXXXXXX" />
          </Field>
          <Submit busy={busy === "promote"}>Promote</Submit>
        </form>
      </Modal>
      <Modal open={!!modal && typeof modal === "object"} onClose={() => setModal(null)} title="Reset manager password">
        {modal && typeof modal === "object" && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              act(modal.reset, "reset", undefined, formObject(e.currentTarget)).then((r) => r && setModal(null));
            }}
          >
            <p className="text-sm text-muted">{modal.reset.name} must choose a new password after logging in with this one.</p>
            <Field label="Temporary password (10+ characters)">
              <input className="input" name="password" required minLength={10} autoComplete="off" />
            </Field>
            <Submit busy={busy === `reset${modal.reset.id}`}>Set password</Submit>
          </form>
        )}
      </Modal>
    </>
  );
}
