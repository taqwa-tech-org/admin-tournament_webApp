import { api } from "@/lib/api";
import { useAction, useTitle } from "@/lib/hooks";
import type { Msg } from "@/lib/types";
import { Btn, Load, useGet } from "@/components/kit";
import { Banner, Empty, PageTitle } from "@/components/ui";

type MapRow = { id: string; name: string; imageUrl: string | null; gameName: string };

export default function MapsPage() {
  useTitle("Map pictures");
  const q = useGet<{ maps: MapRow[] }>("/staff/maps");
  const { run, busy } = useAction();
  const upload = (id: string, file?: File) => {
    if (!file) return;
    const form = new FormData();
    form.set("image", file);
    run(id, () => api<Msg>(`/staff/maps/${id}/image`, { form }), { invalidate: [["/staff/maps"]] });
  };
  return (
    <>
      <PageTitle title="Map pictures" sub="Shown on every match card that uses the map (unless the match has its own banner)." />
      <Load q={q}>
        {(d) =>
          d.maps.length === 0 ? (
            <Empty title="No maps" text="The Super Admin adds maps under Games & maps." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {d.maps.map((m) => (
                <div key={m.id} className="card overflow-hidden p-0">
                  <div className="h-32">
                    <Banner src={m.imageUrl} name={m.name} />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-xs text-muted">{m.gameName}</div>
                    </div>
                    <div className="flex gap-1">
                      <label className="btn-ghost btn-sm cursor-pointer">
                        {busy === m.id ? "Uploading…" : m.imageUrl ? "Change" : "Upload"}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(m.id, e.target.files?.[0])} />
                      </label>
                      {m.imageUrl && (
                        <Btn busy={busy} k={`rm${m.id}`} onClick={() => run(`rm${m.id}`, () => api<Msg>(`/staff/maps/${m.id}/image`, { body: { remove: "1" } }), { invalidate: [["/staff/maps"]] })}>
                          Remove
                        </Btn>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </Load>
    </>
  );
}
