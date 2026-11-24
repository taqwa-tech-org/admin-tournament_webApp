import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { useAction, useTitle } from "@/lib/hooks";
import { CATEGORY_LABEL } from "@/lib/format";
import type { Msg } from "@/lib/types";
import { Btn, Load, Modal, formObject, useGet } from "@/components/kit";
import { Badge, Field, PageTitle, Submit } from "@/components/ui";

type Game = {
  id: string; name: string; slug: string; shortName: string; iconUrl: string | null; bannerUrl: string | null; playerIdLabel: string; playerIdPattern: string; playerIdHint: string;
  isActive: boolean; sortOrder: number;
  versions: { id: string; name: string; code: string; extraFee: number; requiredFileId: string | null; isActive: boolean }[];
  modes: { id: string; name: string; category: string; isActive: boolean }[];
  maps: { id: string; name: string; imageUrl: string | null; isActive: boolean }[];
};
type D = { games: Game[]; files: { id: string; title: string; isActive: boolean }[]; categories: string[] };
type EditState =
  | { kind: "game"; item?: Game }
  | { kind: "version"; game: Game; item?: Game["versions"][number] }
  | { kind: "mode"; game: Game; item?: Game["modes"][number] }
  | { kind: "map"; game: Game; item?: Game["maps"][number] };

const PATH = "/admin/catalog";

export default function CatalogPage() {
  useTitle("Games & maps");
  const q = useGet<D>(PATH);
  const { run, busy } = useAction();
  const [edit, setEdit] = useState<EditState | null>(null);
  const toggle = (kind: string, id: string) => run(`${kind}${id}`, () => api<Msg>("/admin/catalog/toggle", { body: { kind, id } }), { invalidate: [[PATH], ["/staff/maps"]] });
  const image = (g: Game, kind: "icon" | "banner", file?: File) => {
    if (!file) return;
    const form = new FormData();
    form.set("image", file);
    form.set("kind", kind);
    run(`${kind}${g.id}`, () => api<Msg>(`/admin/catalog/games/${g.id}/image`, { form }), { invalidate: [[PATH]] });
  };

  return (
    <>
      <PageTitle
        title="Games & maps"
        sub="Add any game (Free Fire, PUBG Mobile, eFootball, COD Mobile…). Nothing is ever deleted: switch items off instead, old matches keep their history."
        right={
          <button className="btn-primary" onClick={() => setEdit({ kind: "game" })}>
            <Plus className="h-4 w-4" /> Add game
          </button>
        }
      />
      <Load q={q}>
        {(d) => (
          <div className="space-y-4">
            {d.games.map((g) => (
              <div key={g.id} className={`card space-y-4 ${g.isActive ? "" : "opacity-70"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {g.iconUrl ? <img src={mediaUrl(g.iconUrl)!} alt="" className="h-12 w-12 rounded-xl" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 font-bold">{g.shortName || g.name[0]}</div>}
                    <div>
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        {g.name} <Badge tone={g.isActive ? "ok" : "muted"}>{g.isActive ? "Active" : "Off"}</Badge>
                      </div>
                      <div className="text-xs text-muted">
                        /{g.slug} · {g.playerIdLabel} · pattern <code>{g.playerIdPattern}</code>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <label className="btn-ghost btn-sm cursor-pointer">
                      Icon
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => image(g, "icon", e.target.files?.[0])} />
                    </label>
                    <button className="btn-ghost btn-sm" onClick={() => setEdit({ kind: "game", item: g })}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <Btn busy={busy} k={`game${g.id}`} onClick={() => toggle("game", g.id)}>
                      {g.isActive ? "Turn off" : "Turn on"}
                    </Btn>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Column title="Versions" onAdd={() => setEdit({ kind: "version", game: g })}>
                    {g.versions.map((v) => (
                      <Item key={v.id} active={v.isActive} onEdit={() => setEdit({ kind: "version", game: g, item: v })} onToggle={() => toggle("version", v.id)}>
                        {v.name} <span className="text-muted">({v.code})</span>
                        {v.extraFee > 0 && <span className="text-brand-2"> +{v.extraFee}</span>}
                        {v.requiredFileId && <span className="text-info"> · APK</span>}
                      </Item>
                    ))}
                    {g.versions.length === 0 && <p className="text-xs text-muted">Optional (e.g. Regular / Old FF).</p>}
                  </Column>
                  <Column title="Modes" onAdd={() => setEdit({ kind: "mode", game: g })}>
                    {g.modes.map((m) => (
                      <Item key={m.id} active={m.isActive} onEdit={() => setEdit({ kind: "mode", game: g, item: m })} onToggle={() => toggle("mode", m.id)}>
                        {m.name} <span className="text-muted">· {CATEGORY_LABEL[m.category] ?? m.category}</span>
                      </Item>
                    ))}
                  </Column>
                  <Column title="Maps" onAdd={() => setEdit({ kind: "map", game: g })}>
                    {g.maps.map((m) => (
                      <Item key={m.id} active={m.isActive} onEdit={() => setEdit({ kind: "map", game: g, item: m })} onToggle={() => toggle("map", m.id)}>
                        {m.name}
                        {m.imageUrl && <span className="text-ok"> · picture</span>}
                      </Item>
                    ))}
                  </Column>
                </div>
              </div>
            ))}
          </div>
        )}
      </Load>
      {edit && q.data && <Editor edit={edit} data={q.data} onClose={() => setEdit(null)} />}
    </>
  );
}

function Column({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted uppercase">{title}</span>
        <button className="text-xs text-brand hover:underline" onClick={onAdd}>
          + Add
        </button>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Item({ active, children, onEdit, onToggle }: { active: boolean; children: React.ReactNode; onEdit: () => void; onToggle: () => void }) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm ${active ? "" : "opacity-50"}`}>
      <span className="min-w-0 truncate">{children}</span>
      <span className="flex shrink-0 gap-2 text-[11px]">
        <button className="text-muted hover:text-ink" onClick={onEdit}>
          edit
        </button>
        <button className="text-muted hover:text-ink" onClick={onToggle}>
          {active ? "off" : "on"}
        </button>
      </span>
    </div>
  );
}

function Editor({ edit, data, onClose }: { edit: EditState; data: D; onClose: () => void }) {
  const { run, busy } = useAction();
  const isNew = !edit.item;
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = formObject(e.currentTarget);
    let path = "";
    let body: Record<string, unknown> = {};
    if (edit.kind === "game") {
      path = isNew ? "/admin/catalog/games" : `/admin/catalog/games/${edit.item!.id}`;
      body = { ...f, sortOrder: Number(f.sortOrder || 0) };
    } else if (edit.kind === "version") {
      path = isNew ? "/admin/catalog/versions" : `/admin/catalog/versions/${edit.item!.id}`;
      body = { gameId: edit.game.id, name: f.name, code: f.code, extraFee: Number(f.extraFee || 0), requiredFileId: f.requiredFileId || null };
    } else if (edit.kind === "mode") {
      path = isNew ? "/admin/catalog/modes" : `/admin/catalog/modes/${edit.item!.id}`;
      body = { gameId: edit.game.id, name: f.name, category: f.category };
    } else {
      path = isNew ? "/admin/catalog/maps" : `/admin/catalog/maps/${edit.item!.id}`;
      body = { gameId: edit.game.id, name: f.name };
    }
    run("save", () => api<Msg>(path, { method: isNew ? "POST" : "PUT", body }), { invalidate: [[PATH], ["/staff/maps"], ["/admin/templates"]] }).then((r) => r && onClose());
  };
  const title = `${isNew ? "Add" : "Edit"} ${edit.kind}${edit.kind !== "game" ? ` · ${edit.game.name}` : ""}`;
  return (
    <Modal open onClose={onClose} title={title}>
      <form className="space-y-3" onSubmit={submit}>
        {edit.kind === "game" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <input className="input" name="name" defaultValue={edit.item?.name} required maxLength={40} placeholder="PUBG Mobile" />
              </Field>
              <Field label="Short name">
                <input className="input" name="shortName" defaultValue={edit.item?.shortName} maxLength={12} placeholder="PUBG" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Link slug" hint="Lowercase, used in links: pubg-mobile">
                <input className="input" name="slug" defaultValue={edit.item?.slug} required pattern="[a-z0-9-]{2,30}" />
              </Field>
              <Field label="Sort order">
                <input className="input" name="sortOrder" type="number" defaultValue={edit.item?.sortOrder ?? 0} />
              </Field>
            </div>
            <Field label="Player ID label" hint='What players see, e.g. "PUBG Character ID"'>
              <input className="input" name="playerIdLabel" defaultValue={edit.item?.playerIdLabel ?? "Player ID"} required />
            </Field>
            <Field label="Player ID pattern (regular expression)" hint="Numbers only, 6–13 digits: ^[0-9]{6,13}$">
              <input className="input font-mono" name="playerIdPattern" defaultValue={edit.item?.playerIdPattern ?? "^[0-9]{6,15}$"} required />
            </Field>
            <Field label="Help text for players">
              <input className="input" name="playerIdHint" defaultValue={edit.item?.playerIdHint} maxLength={120} placeholder="Find it on your in-game profile." />
            </Field>
          </>
        )}
        {edit.kind === "version" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <input className="input" name="name" defaultValue={edit.item?.name} required placeholder="Old FF" />
              </Field>
              <Field label="Code">
                <input className="input uppercase" name="code" defaultValue={edit.item?.code} required placeholder="OLD_FF" />
              </Field>
            </div>
            <Field label="Extra fee per player (tokens)" hint="Added to every match fee on this version (new matches only).">
              <input className="input" name="extraFee" type="number" min={0} defaultValue={edit.item?.extraFee ?? 0} />
            </Field>
            <Field label="Required app / APK (optional)" hint="Players see a download button on matches of this version.">
              <select className="input" name="requiredFileId" defaultValue={edit.item?.requiredFileId ?? ""}>
                <option value="">None</option>
                {data.files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                    {f.isActive ? "" : " (hidden)"}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {edit.kind === "mode" && (
          <>
            <Field label="Name">
              <input className="input" name="name" defaultValue={edit.item?.name} required placeholder="Battle Royale" />
            </Field>
            <Field label="Category (for player filters)">
              <select className="input" name="category" defaultValue={edit.item?.category ?? "BR"}>
                {data.categories.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c] ?? c}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {edit.kind === "map" && (
          <Field label="Name" hint="Upload the picture from Map pictures.">
            <input className="input" name="name" defaultValue={edit.item?.name} required placeholder="Erangel" />
          </Field>
        )}
        <Submit busy={busy === "save"}>{isNew ? "Add" : "Save"}</Submit>
      </form>
    </Modal>
  );
}
