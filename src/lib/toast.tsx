import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

type Toast = { id: number; kind: "ok" | "error"; text: string };
type Ctx = { ok: (text: string) => void; error: (text: string) => void };
const ToastCtx = createContext<Ctx>({ ok: () => undefined, error: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const remove = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind: Toast["kind"], text: string) => {
      const id = Date.now() + Math.random();
      setItems((l) => [...l.slice(-3), { id, kind, text }]);
      setTimeout(() => remove(id), kind === "error" ? 6000 : 3500);
    },
    [remove],
  );
  const value = useMemo(() => ({ ok: (t: string) => push("ok", t), error: (t: string) => push("error", t) }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`fade-in pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-xl backdrop-blur ${
              t.kind === "ok" ? "border-ok/40 bg-[#0f2418]/95 text-ink" : "border-bad/40 bg-[#2a1212]/95 text-ink"
            }`}
          >
            {t.kind === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />}
            <span className="flex-1">{t.text}</span>
            <button onClick={() => remove(t.id)} className="text-muted hover:text-ink" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
