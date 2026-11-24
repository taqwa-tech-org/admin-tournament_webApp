import { useState } from "react";
import { Upload } from "lucide-react";
import { api, uploadWithProgress } from "@/lib/api";
import { useAction, useTitle } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import { fmtDateTime, fmtSize } from "@/lib/format";
import type { Msg } from "@/lib/types";
import { Btn, Load, TableCard, useGet } from "@/components/kit";
import { Badge, Field, PageTitle } from "@/components/ui";
import { useQueryClient } from "@tanstack/react-query";

type F = { id: string; title: string; version: string; notes: string | null; fileName: string; size: number; sha256: string; isActive: boolean; downloads: number; createdAt: string; uploadedBy: string };

export default function FilesPage() {
  useTitle("APK / files");
  const q = useGet<{ files: F[] }>("/admin/files");
  const { run, busy } = useAction();
  const inv = { invalidate: [["/admin/files"], ["/admin/catalog"]] };
  return (
    <>
      <PageTitle title="APK / files" sub="Game versions players must install (e.g. Old FF). Link a file to a game version under Games & maps." />
      <UploadForm />
      <Load q={q}>
        {(d) => (
          <TableCard title="Files">
            {d.files.length === 0 ? (
              <p className="p-4 text-sm text-muted">No files uploaded.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Size</th>
                    <th className="text-right">Downloads</th>
                    <th>Uploaded</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.files.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <span className="font-semibold">{f.title}</span> <span className="text-muted">v{f.version}</span>
                        <span className="block text-[11px] text-muted">{f.fileName}</span>
                        <span className="block font-mono text-[10px] break-all text-muted">sha256 {f.sha256.slice(0, 24)}…</span>
                      </td>
                      <td className="text-xs">{fmtSize(f.size)}</td>
                      <td className="text-right">{f.downloads}</td>
                      <td className="text-xs">
                        {fmtDateTime(f.createdAt)}
                        <span className="block text-muted">{f.uploadedBy}</span>
                      </td>
                      <td>
                        <Badge tone={f.isActive ? "ok" : "muted"}>{f.isActive ? "Visible" : "Hidden"}</Badge>
                      </td>
                      <td className="space-x-1 text-right whitespace-nowrap">
                        <Btn busy={busy} k={`t${f.id}`} onClick={() => run(`t${f.id}`, () => api<Msg>(`/admin/files/${f.id}/toggle`, { body: {} }), inv)}>
                          {f.isActive ? "Hide" : "Show"}
                        </Btn>
                        <Btn busy={busy} k={`d${f.id}`} className="btn-ghost btn-sm text-bad" onClick={() => run(`d${f.id}`, () => api<Msg>(`/admin/files/${f.id}`, { method: "DELETE" }), { ...inv, confirm: `Delete ${f.fileName} permanently?` })}>
                          Delete
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TableCard>
        )}
      </Load>
    </>
  );
}

function UploadForm() {
  const toast = useToast();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (!file) return;
    setPct(0);
    try {
      const r = await uploadWithProgress<Msg>(
        "/admin/files",
        file,
        {
          "X-File-Name": encodeURIComponent(file.name),
          "X-Title": encodeURIComponent(String(f.get("title"))),
          "X-Version": encodeURIComponent(String(f.get("version"))),
          "X-Notes": encodeURIComponent(String(f.get("notes") ?? "")),
        },
        setPct,
      );
      toast.ok(r.message);
      form.reset();
      setFile(null);
      await qc.invalidateQueries({ queryKey: ["/admin/files"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPct(null);
    }
  };
  return (
    <form onSubmit={submit} className="card mb-4 space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <Upload className="h-4 w-4 text-brand-2" /> Upload a file
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Title">
          <input className="input" name="title" required maxLength={80} placeholder="Free Fire Old Version" />
        </Field>
        <Field label="Version">
          <input className="input" name="version" required maxLength={30} placeholder="1.59.5" />
        </Field>
        <Field label="File (.apk .xapk .obb .zip .pdf, max 2 GB)">
          <input className="input" type="file" accept=".apk,.xapk,.obb,.zip,.pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
      </div>
      <Field label="Notes for players (install steps)">
        <textarea className="input" name="notes" rows={2} maxLength={500} />
      </Field>
      {pct !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-gradient-to-r from-brand-2 to-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      <button className="btn-primary" disabled={pct !== null || !file}>
        {pct !== null ? `Uploading ${pct}%` : "Upload"}
      </button>
    </form>
  );
}
