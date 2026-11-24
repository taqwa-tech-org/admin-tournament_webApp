import { useMemo, useState } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAction, useTitle } from "@/lib/hooks";
import { TEAM_SIZE, n } from "@/lib/format";
import { describeRule, profitCheck, type Reward } from "@/lib/prize";
import type { Msg } from "@/lib/types";
import { Btn, Load, Modal, useGet } from "@/components/kit";
import { Badge, Empty, Field, Notice, PageTitle } from "@/components/ui";

type Tpl = {
  id: string; name: string; gameId: string; gameName: string; versionId: string | null; versionName: string | null; modeId: string; modeName: string; category: string;
  mapId: string | null; mapName: string | null; format: string; slots: number; minEntries: number; entryFee: number; extraFee: number; commissionPct: number; rulesText: string; isActive: boolean; rewards: Reward[];
};
type Catalog = {
  games: { id: string; name: string; isActive: boolean; versions: { id: string; name: string; extraFee: number; isActive: boolean }[]; modes: { id: string; name: string; isActive: boolean }[]; maps: { id: string; name: string; isActive: boolean }[] }[];
  formats: string[];
};

export default function TemplatesPage() {
  useTitle("Templates & prizes");
  const q = useGet<{ templates: Tpl[] }>("/admin/templates");
  const cat = useGet<Catalog>("/admin/catalog");
  const { run, busy } = useAction();
  const [edit, setEdit] = useState<Tpl | "new" | null>(null);
  const inv = { invalidate: [["/admin/templates"], ["/staff/templates"]] };

  return (
    <>
      <PageTitle
        title="Templates & prizes"
        sub="Managers create matches only from these. Fees and prizes are copied into each match, so edits never change running matches."
        right={
          <button className="btn-primary" onClick={() => setEdit("new")} disabled={!cat.data}>
            <Plus className="h-4 w-4" /> New template
          </button>
        }
      />
      <Load q={q}>
        {(d) =>
          d.templates.length === 0 ? (
            <Empty title="No templates yet" text="Create the first one: choose a game, mode, fee and prizes." />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {d.templates.map((t) => {
                const teamSize = TEAM_SIZE[t.format] ?? 1;
                const pc = profitCheck({ ...t, teamSize });
                return (
                  <div key={t.id} className={`card space-y-3 ${t.isActive ? "" : "opacity-60"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-xs text-muted">
                          {t.gameName}
                          {t.versionName ? ` (${t.versionName})` : ""} · {t.modeName} · {t.format}
                          {t.mapName ? ` · ${t.mapName}` : ""}
                        </div>
                      </div>
                      <Badge tone={t.isActive ? "ok" : "muted"}>{t.isActive ? "Active" : "Off"}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-surface-2 p-2">
                        <div className="text-muted">Entry/player</div>
                        <b>{t.entryFee + t.extraFee}</b>
                      </div>
                      <div className="rounded-lg bg-surface-2 p-2">
                        <div className="text-muted">Slots (min)</div>
                        <b>
                          {t.slots} ({t.minEntries})
                        </b>
                      </div>
                      <div className="rounded-lg bg-surface-2 p-2">
                        <div className="text-muted">Commission</div>
                        <b>{t.commissionPct}%</b>
                      </div>
                      <div className={`rounded-lg p-2 ${pc.full.worstMargin < 0 ? "bg-bad/15" : "bg-ok/10"}`}>
                        <div className="text-muted">Full-house margin</div>
                        <b className={pc.full.worstMargin < 0 ? "text-bad" : "text-ok"}>{n(pc.full.typicalMargin)}</b>
                      </div>
                    </div>
                    <ul className="space-y-0.5 text-xs">
                      {t.rewards.length === 0 && <li className="text-warn">No prizes yet: managers cannot use this template.</li>}
                      {t.rewards.map((r, i) => (
                        <li key={i}>
                          • <b>{r.label}</b> — {describeRule(r)}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => setEdit(t)} disabled={!cat.data}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <Btn busy={busy} k={`t${t.id}`} onClick={() => run(`t${t.id}`, () => api<Msg>(`/admin/templates/${t.id}/toggle`, { body: {} }), inv)}>
                        {t.isActive ? "Disable" : "Enable"}
                      </Btn>
                      <Btn busy={busy} k={`c${t.id}`} onClick={() => run(`c${t.id}`, () => api<Msg>(`/admin/templates/${t.id}/duplicate`, { body: {} }), inv)}>
                        <Copy className="h-3.5 w-3.5" /> Duplicate
                      </Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </Load>
      {edit && cat.data && <TemplateEditor tpl={edit === "new" ? null : edit} catalog={cat.data} onClose={() => setEdit(null)} />}
    </>
  );
}

const emptyReward = (type: Reward["type"]): Reward => ({ type, label: type === "PER_KILL" ? "Per kill" : type === "MANUAL" ? "" : "", tokens: 0, place: type === "PLACEMENT" ? 1 : null, placeTo: null, condition: null });

function TemplateEditor({ tpl, catalog, onClose }: { tpl: Tpl | null; catalog: Catalog; onClose: () => void }) {
  const { run, busy } = useAction();
  const games = catalog.games.filter((g) => g.isActive || g.id === tpl?.gameId);
  const [f, setF] = useState(() => ({
    name: tpl?.name ?? "",
    gameId: tpl?.gameId ?? games[0]?.id ?? "",
    versionId: tpl?.versionId ?? "",
    modeId: tpl?.modeId ?? "",
    mapId: tpl?.mapId ?? "",
    format: tpl?.format ?? "SOLO",
    slots: tpl?.slots ?? 48,
    minEntries: tpl?.minEntries ?? 20,
    entryFee: tpl?.entryFee ?? 10,
    commissionPct: tpl?.commissionPct ?? 20,
    rulesText: tpl?.rulesText ?? "",
  }));
  const [rewards, setRewards] = useState<Reward[]>(tpl?.rewards ?? [{ ...emptyReward("PLACEMENT"), label: "Winner (#1)" }]);
  const game = catalog.games.find((g) => g.id === f.gameId);
  const version = game?.versions.find((v) => v.id === f.versionId);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const teamSize = TEAM_SIZE[f.format] ?? 1;
  const pc = useMemo(() => profitCheck({ rewards, slots: f.slots, minEntries: f.minEntries, entryFee: f.entryFee, extraFee: version?.extraFee ?? 0, teamSize, commissionPct: f.commissionPct }), [rewards, f, version, teamSize]);
  const updateReward = (i: number, patch: Partial<Reward>) => setRewards((l) => l.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = () => {
    const body = {
      ...f,
      versionId: f.versionId || null,
      mapId: f.mapId || null,
      rewards: rewards.map((r) => ({ ...r, place: r.type === "PLACEMENT" ? r.place : null, placeTo: r.type === "PLACEMENT" ? r.placeTo || null : null, condition: r.type === "MANUAL" ? r.condition : null })),
    };
    run("save", () => api<Msg>(tpl ? `/admin/templates/${tpl.id}` : "/admin/templates", { method: tpl ? "PUT" : "POST", body }), {
      invalidate: [["/admin/templates"], ["/staff/templates"]],
    }).then((r) => r && onClose());
  };

  const scenario = (label: string, s: ReturnType<typeof profitCheck>["full"]) => (
    <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs">
      <div className="mb-1 font-semibold">
        {label}: {s.entries} {teamSize > 1 ? "teams" : "players"} ({s.players} players)
      </div>
      <div className="flex justify-between">
        <span className="text-muted">Entry fees in</span>
        <b>{n(s.income)}</b>
      </div>
      <div className="flex justify-between">
        <span className="text-muted">Prizes, typical (70% kills)</span>
        <span>{n(s.typical)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted">Prizes, worst case</span>
        <span>{n(s.worst)}</span>
      </div>
      <div className={`mt-1 flex justify-between border-t border-line pt-1 font-semibold ${s.typicalMargin < 0 ? "text-bad" : "text-ok"}`}>
        <span>Platform keeps (typical)</span>
        <span>
          {n(s.typicalMargin)} ({s.income ? Math.round((s.typicalMargin / s.income) * 100) : 0}%)
        </span>
      </div>
      <div className={`flex justify-between ${s.worstMargin < 0 ? "text-bad" : "text-muted"}`}>
        <span>Worst case</span>
        <span>{n(s.worstMargin)}</span>
      </div>
    </div>
  );

  return (
    <Modal open onClose={onClose} title={tpl ? `Edit: ${tpl.name}` : "New template"} wide>
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <Field label="Template name">
            <input className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} placeholder="e.g. FF Solo BR — Bermuda" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Game">
              <select className="input" value={f.gameId} onChange={(e) => set({ gameId: e.target.value, versionId: "", modeId: "", mapId: "" })}>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Version (optional)">
              <select className="input" value={f.versionId} onChange={(e) => set({ versionId: e.target.value })}>
                <option value="">Any / not needed</option>
                {game?.versions.filter((v) => v.isActive || v.id === f.versionId).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.extraFee ? ` (+${v.extraFee})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mode">
              <select className="input" value={f.modeId} onChange={(e) => set({ modeId: e.target.value })} required>
                <option value="">Choose…</option>
                {game?.modes.filter((m) => m.isActive || m.id === f.modeId).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Map (optional)">
              <select className="input" value={f.mapId} onChange={(e) => set({ mapId: e.target.value })}>
                <option value="">Any</option>
                {game?.maps.filter((m) => m.isActive || m.id === f.mapId).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Format">
              <select className="input" value={f.format} onChange={(e) => set({ format: e.target.value })}>
                {catalog.formats.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label={teamSize > 1 ? "Slots (teams)" : "Slots"}>
              <input className="input" type="number" min={2} max={100} value={f.slots} onChange={(e) => set({ slots: Number(e.target.value) })} />
            </Field>
            <Field label="Minimum to run">
              <input className="input" type="number" min={0} max={f.slots} value={f.minEntries} onChange={(e) => set({ minEntries: Number(e.target.value) })} />
            </Field>
            <Field label="Fee per player">
              <input className="input" type="number" min={0} value={f.entryFee} onChange={(e) => set({ entryFee: Number(e.target.value) })} />
            </Field>
            <Field label="Commission %">
              <input className="input" type="number" min={0} max={100} value={f.commissionPct} onChange={(e) => set({ commissionPct: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Match rules shown to players (optional)">
            <textarea className="input" rows={2} value={f.rulesText} onChange={(e) => set({ rulesText: e.target.value })} maxLength={2000} placeholder="e.g. No emulators. Gun attributes OFF." />
          </Field>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">Prizes (tokens)</span>
              <div className="flex gap-1">
                {(["PLACEMENT", "PER_KILL", "MANUAL"] as const).map((t) => (
                  <button key={t} type="button" className="btn-ghost btn-sm" onClick={() => setRewards((l) => [...l, emptyReward(t)])}>
                    <Plus className="h-3 w-3" /> {t === "PLACEMENT" ? "Position" : t === "PER_KILL" ? "Per kill" : "Special"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {rewards.map((r, i) => (
                <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-line bg-surface-2/60 p-2">
                  <div className="col-span-12 text-[10px] font-semibold text-muted uppercase sm:col-span-2 sm:self-center">{r.type === "PLACEMENT" ? "Position" : r.type === "PER_KILL" ? "Per kill" : "Special"}</div>
                  <div className="col-span-6 sm:col-span-3">
                    <input className="input py-1.5" placeholder="Label" value={r.label} onChange={(e) => updateReward(i, { label: e.target.value })} />
                  </div>
                  {r.type === "PLACEMENT" && (
                    <>
                      <div className="col-span-3 sm:col-span-2">
                        <input className="input py-1.5" type="number" min={1} max={100} title="From position" value={r.place ?? 1} onChange={(e) => updateReward(i, { place: Number(e.target.value) })} />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <input className="input py-1.5" type="number" min={1} max={100} title="To position (optional)" placeholder="to" value={r.placeTo ?? ""} onChange={(e) => updateReward(i, { placeTo: e.target.value ? Number(e.target.value) : null })} />
                      </div>
                    </>
                  )}
                  {r.type === "MANUAL" && (
                    <div className="col-span-6 sm:col-span-4">
                      <input className="input py-1.5" placeholder="Condition (e.g. most headshots)" value={r.condition ?? ""} onChange={(e) => updateReward(i, { condition: e.target.value })} />
                    </div>
                  )}
                  {r.type === "PER_KILL" && <div className="hidden sm:col-span-4 sm:block" />}
                  <div className="col-span-4 sm:col-span-2">
                    <input className="input py-1.5" type="number" min={0} title="Tokens" value={r.tokens} onChange={(e) => updateReward(i, { tokens: Number(e.target.value) })} />
                  </div>
                  <button type="button" className="col-span-2 flex justify-center text-muted hover:text-bad sm:col-span-1" onClick={() => setRewards((l) => l.filter((_, j) => j !== i))} aria-label="Remove prize">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <h3 className="text-sm font-semibold">Profit check</h3>
          <p className="text-xs text-muted">
            Entry per {teamSize > 1 ? "team" : "player"}: <b className="text-ink">{pc.feePerEntry}</b> tokens. Make sure the platform keeps money even with the minimum number of players.
          </p>
          {scenario("Full", pc.full)}
          {f.minEntries > 0 && scenario("Minimum", pc.min)}
          {(pc.min.typicalMargin < 0 || pc.full.typicalMargin < 0) && <Notice tone="bad">These prizes lose money. Lower the prizes or raise the fee / minimum entries.</Notice>}
          {f.minEntries === 0 && <Notice>No minimum: if only a few join, fixed prizes can cost more than the fees. Set a minimum.</Notice>}
          <button className="btn-primary w-full" onClick={save} disabled={busy === "save" || !f.name || !f.modeId}>
            {busy === "save" ? "Saving…" : tpl ? "Save template" : "Create template"}
          </button>
        </aside>
      </div>
    </Modal>
  );
}
