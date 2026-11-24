import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "@/lib/api";
import { useAction, useTitle } from "@/lib/hooks";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import { Load, useGet } from "@/components/kit";
import { Empty, Field, Notice, PageTitle, Submit, Token } from "@/components/ui";

type T = { id: string; name: string; gameId: string; gameName: string; versionName: string | null; modeName: string; category: string; mapName: string | null; format: string; slots: number; minEntries: number; entryFee: number; rewardsCount: number };

export default function NewMatchPage() {
  useTitle("New match");
  const q = useGet<{ templates: T[] }>("/staff/templates");
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="New match" sub="Pick a template. Fee, prizes and rules come from it, so every match follows the owner's pricing." />
      <Load q={q}>{(d) => (d.templates.length ? <Form templates={d.templates} /> : <Empty title="No templates yet" text="The Super Admin must create match templates first." />)}</Load>
    </div>
  );
}

function Form({ templates }: { templates: T[] }) {
  const nav = useNavigate();
  const { run, busy } = useAction();
  const games = useMemo(() => [...new Set(templates.map((t) => t.gameName))], [templates]);
  const [game, setGame] = useState(games[0]);
  const list = templates.filter((t) => t.gameName === game);
  const [templateId, setTemplateId] = useState(list[0]?.id ?? "");
  const t = templates.find((x) => x.id === templateId);
  const [repeat, setRepeat] = useState(1);

  return (
    <form
      className="card space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(
          "create",
          () =>
            api<{ message: string; id: string }>("/staff/matches", {
              body: {
                templateId,
                startAt: fromLocalInput(String(f.get("startAt"))),
                title: String(f.get("title") ?? "").trim() || undefined,
                repeatCount: repeat,
                repeatEveryMinutes: Number(f.get("every") || 60),
              },
            }),
          { invalidate: [["/staff/matches"]] },
        ).then((r) => r && nav(repeat > 1 ? "/matches" : `/matches/${r.id}`));
      }}
    >
      <div className="flex flex-wrap gap-2">
        {games.map((g) => (
          <button
            type="button"
            key={g}
            className={`chip ${game === g ? "border-brand bg-brand/15 text-brand-2" : "border-line text-muted"}`}
            onClick={() => {
              setGame(g);
              setTemplateId(templates.find((x) => x.gameName === g)?.id ?? "");
            }}
          >
            {g}
          </button>
        ))}
      </div>
      <Field label="Template">
        <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)} required>
          {list.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </Field>
      {t && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface-2/60 p-3 text-sm sm:grid-cols-4">
          <div>
            <div className="text-[11px] text-muted">Mode</div>
            {t.modeName} · {t.format}
          </div>
          <div>
            <div className="text-[11px] text-muted">Map / version</div>
            {t.mapName ?? "Any"}
            {t.versionName ? ` · ${t.versionName}` : ""}
          </div>
          <div>
            <div className="text-[11px] text-muted">Entry (per player)</div>
            <Token value={t.entryFee} />
          </div>
          <div>
            <div className="text-[11px] text-muted">Slots</div>
            {t.slots}
            {t.minEntries ? ` (min ${t.minEntries})` : ""}
          </div>
        </div>
      )}
      {t && t.rewardsCount === 0 && <Notice tone="bad">This template has no prizes yet. Ask the Super Admin to add them.</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start time (Bangladesh time)">
          <input className="input" type="datetime-local" name="startAt" required defaultValue={toLocalInput(new Date(Date.now() + 2 * 3600_000))} />
        </Field>
        <Field label="Title (optional)" hint="Leave empty to use the template name.">
          <input className="input" name="title" maxLength={80} placeholder={t?.name} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="How many matches" hint="Create a series in one go (e.g. 6 matches, one every hour).">
          <input className="input" type="number" min={1} max={12} value={repeat} onChange={(e) => setRepeat(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
        </Field>
        {repeat > 1 && (
          <Field label="Minutes between matches">
            <input className="input" type="number" name="every" min={15} max={1440} defaultValue={60} />
          </Field>
        )}
      </div>
      <Submit busy={busy === "create"} disabled={!t || t.rewardsCount === 0}>
        {repeat > 1 ? `Create ${repeat} matches` : "Create match"}
      </Submit>
    </form>
  );
}
