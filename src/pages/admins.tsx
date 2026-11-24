import { useState } from "react";
import { Shield, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { useAction, useTitle } from "@/lib/hooks";
import { fmtDateTime } from "@/lib/format";
import type { Msg } from "@/lib/types";
import { Btn, Load, Modal, TableCard, formObject, useGet } from "@/components/kit";
import { Badge, Field, Notice, PageTitle, Submit } from "@/components/ui";

type A = { id: string; name: string; phone: string; status: string; mustChangePassword: boolean; lastLoginAt: string | null; createdAt: string };

export default function AdminsPage() {
  useTitle("Admins");
  const path = "/admin/admins";
  const q = useGet<{ owner: { name: string; phone: string }; admins: A[] }>(path);
  const { run, busy } = useAction();
  const [modal, setModal] = useState<null | "add" | "promote" | { reset: A }>(null);
  const inv = { invalidate: [[path]] };
  const act = (a: A, op: string, confirm?: string, extra: Record<string, unknown> = {}) =>
    run(`${op}${a.id}`, () => api<Msg>(`/admin/admins/${a.id}/action`, { body: { op, ...extra } }), { ...inv, confirm });

  return (
    <>
      <PageTitle
        title="Admins"
        sub="Admins handle payments, players, bans and all matches. Only you (Super Admin) control prices, settings, files and admins."
        right={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setModal("promote")}>
              Promote existing account
            </button>
            <button className="btn-primary" onClick={() => setModal("add")}>
              <UserPlus className="h-4 w-4" /> Add admin
            </button>
          </div>
        }
      />
      <Load q={q}>
        {(d) => (
          <div className="space-y-4">
            <div className="card flex items-center gap-3">
              <Shield className="h-6 w-6 text-brand-2" />
              <div>
                <div className="font-semibold">{d.owner.name} (Super Admin, you)</div>
                <div className="text-xs text-muted">To hand over ownership, run "npm run create-admin" on the server.</div>
              </div>
            </div>
            <TableCard title={`Admins (${d.admins.length})`}>
              {d.admins.length === 0 ? (
                <p className="p-4 text-sm text-muted">No admins yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Admin</th>
                      <th>Last login</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {d.admins.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <span className="font-semibold">{a.name}</span>
                          <span className="block text-xs text-muted">{a.phone}</span>
                        </td>
                        <td className="text-xs">{fmtDateTime(a.lastLoginAt)}</td>
                        <td>
                          <Badge tone={a.status === "ACTIVE" ? "ok" : "bad"}>{a.status}</Badge>
                        </td>
                        <td className="space-x-1 text-right whitespace-nowrap">
                          {a.status === "ACTIVE" ? (
                            <Btn busy={busy} k={`block${a.id}`} onClick={() => act(a, "block", `Block ${a.name}?`)}>
                              Block
                            </Btn>
                          ) : (
                            <Btn busy={busy} k={`unblock${a.id}`} onClick={() => act(a, "unblock")}>
                              Unblock
                            </Btn>
                          )}
                          <button className="btn-ghost btn-sm" onClick={() => setModal({ reset: a })}>
                            Reset password
                          </button>
                          <Btn busy={busy} k={`remove${a.id}`} onClick={() => act(a, "remove", `Remove admin rights from ${a.name}? They become a manager.`)}>
                            Remove rights
                          </Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TableCard>
          </div>
        )}
      </Load>

      <Modal open={modal === "add"} onClose={() => setModal(null)} title="Add admin">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run("add", () => api<Msg>("/admin/admins", { body: formObject(e.currentTarget) }), inv).then((r) => r && setModal(null)); }}>
          <Field label="Name">
            <input className="input" name="name" required minLength={2} />
          </Field>
          <Field label="Mobile number">
            <input className="input" name="phone" required placeholder="01XXXXXXXXX" />
          </Field>
          <Field label="Temporary password (10+ characters)">
            <input className="input" name="password" required minLength={10} autoComplete="off" />
          </Field>
          <Submit busy={busy === "add"}>Add admin</Submit>
        </form>
      </Modal>
      <Modal open={modal === "promote"} onClose={() => setModal(null)} title="Promote an existing account to Admin">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run("promote", () => api<Msg>("/admin/admins/promote", { body: formObject(e.currentTarget) }), inv).then((r) => r && setModal(null)); }}>
          <Notice>A player with tokens or a running match cannot become an admin.</Notice>
          <Field label="Mobile number">
            <input className="input" name="phone" required placeholder="01XXXXXXXXX" />
          </Field>
          <Submit busy={busy === "promote"}>Promote</Submit>
        </form>
      </Modal>
      <Modal open={!!modal && typeof modal === "object"} onClose={() => setModal(null)} title="Reset admin password">
        {modal && typeof modal === "object" && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); act(modal.reset, "reset", undefined, formObject(e.currentTarget)).then((r) => r && setModal(null)); }}>
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
