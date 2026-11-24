import { useState } from "react";
import { Search } from "lucide-react";
import { ROLE_LABEL } from "@/lib/auth";
import { useTitle } from "@/lib/hooks";
import { fmtDateTime } from "@/lib/format";
import type { Paged } from "@/lib/types";
import { Load, TableCard, useGet } from "@/components/kit";
import { PageTitle, Pager } from "@/components/ui";

type L = { id: string; createdAt: string; actor: { name?: string; role?: string; phone?: string } | null; action: string; entity: string; entityId: string | null; data: unknown };

export default function AuditPage() {
  useTitle("Audit log");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const q = useGet<Paged & { logs: L[] }>(`/admin/audit?action=${encodeURIComponent(action)}&page=${page}`);
  return (
    <>
      <PageTitle title="Audit log" sub="Every staff action and money request, with who did it and when." />
      <form
        className="mb-3 flex max-w-md items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          setAction(String(new FormData(e.currentTarget).get("a") ?? "").trim());
          setPage(1);
        }}
      >
        <input className="input" name="a" placeholder="Filter by action, e.g. deposit, ban, room, settings" />
        <button className="btn-ghost" aria-label="Filter">
          <Search className="h-4 w-4" />
        </button>
      </form>
      <Load q={q}>
        {(d) => (
          <TableCard right={<span className="text-xs text-muted">{d.total} entries</span>}>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {d.logs.map((l) => (
                  <tr key={l.id}>
                    <td className="text-xs whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                    <td className="text-xs">
                      {l.actor ? (
                        <>
                          {l.actor.name}
                          <span className="block text-muted">{ROLE_LABEL[l.actor.role ?? ""] ?? l.actor.role}</span>
                        </>
                      ) : (
                        <span className="text-muted">System</span>
                      )}
                    </td>
                    <td className="font-mono text-xs">
                      {l.action}
                      <span className="block text-muted">
                        {l.entity}
                        {l.entityId ? ` ${l.entityId.slice(-6)}` : ""}
                      </span>
                    </td>
                    <td className="max-w-md">
                      {l.data ? <code className="block truncate text-[11px] text-muted" title={JSON.stringify(l.data)}>{JSON.stringify(l.data)}</code> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={d.page} total={d.total} limit={d.limit} onPage={setPage} />
          </TableCard>
        )}
      </Load>
    </>
  );
}
