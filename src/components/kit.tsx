import { useEffect, useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { dhakaToday } from "@/lib/format";
import { ErrorState, PageLoader, Spinner } from "./ui";

/** GET an API path with TanStack Query (cache key = the path). */
export function useGet<T>(path: string | null, opts: { refetchInterval?: number } = {}) {
  return useQuery({ queryKey: [path], queryFn: () => api<T>(path!), enabled: !!path, refetchInterval: opts.refetchInterval });
}

/** Loading / error / data switch for a query. */
export function Load<T>({ q, children }: { q: UseQueryResult<T>; children: (data: T) => React.ReactNode }) {
  if (q.isLoading) return <PageLoader />;
  if (q.error || q.data === undefined) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  return <>{children(q.data)}</>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`fade-in max-h-[92dvh] w-full overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: React.ReactNode }[] }) {
  return (
    <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
      {items.map((i) => (
        <button
          key={i.value}
          onClick={() => onChange(i.value)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition ${value === i.value ? "bg-brand/15 font-semibold text-brand-2" : "text-muted hover:text-ink"}`}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

/** From / to date filter (Bangladesh dates). Defaults to this month. */
export function PeriodFilter({ value, onChange }: { value: { from: string; to: string }; onChange: (v: { from: string; to: string }) => void }) {
  const today = dhakaToday();
  const presets = [
    { label: "Today", from: today, to: today },
    { label: "This month", from: `${today.slice(0, 8)}01`, to: today },
    { label: "Last 30 days", from: new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10), to: today },
    { label: "This year", from: `${today.slice(0, 4)}-01-01`, to: today },
  ];
  return (
    <div className="mb-4 flex flex-wrap items-end gap-2">
      {presets.map((p) => (
        <button
          key={p.label}
          className={`chip ${value.from === p.from && value.to === p.to ? "border-brand bg-brand/15 text-brand-2" : "border-line text-muted"}`}
          onClick={() => onChange({ from: p.from, to: p.to })}
        >
          {p.label}
        </button>
      ))}
      <input type="date" className="input w-auto py-1.5" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value })} />
      <span className="text-muted">→</span>
      <input type="date" className="input w-auto py-1.5" value={value.to} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} />
    </div>
  );
}

export function usePeriod() {
  const today = dhakaToday();
  return useState({ from: `${today.slice(0, 8)}01`, to: today });
}

/** Small action button with its own spinner. */
export function Btn({ busy, k, className = "btn-ghost btn-sm", children, onClick, disabled, type = "button" }: { busy: string | null; k: string; className?: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit" }) {
  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled || busy === k}>
      {busy === k && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function TableCard({ title, right, children }: { title?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden p-0">
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
          {title && <h2 className="font-semibold">{title}</h2>}
          {right}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

/** Read a <form> as a plain object of strings. */
export function formObject(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
}
