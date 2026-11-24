import { useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, Check, Copy, Inbox, Loader2 } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { useNow } from "@/lib/hooks";
import { STATUS_LABEL } from "@/lib/format";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-label="Loading" />;
}

export function PageLoader() {
  return (
    <div className="space-y-3 py-2">
      <div className="skeleton h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-56" />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-warn" />
      <p className="text-sm text-muted">{(error as Error)?.message ?? "Something went wrong."}</p>
      {retry && (
        <button className="btn-ghost btn-sm" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-12 text-center">
      <Inbox className="h-9 w-9 text-muted/60" />
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

type Tone = "ok" | "warn" | "bad" | "info" | "brand" | "muted";
const TONES: Record<Tone, string> = {
  ok: "border-ok/40 bg-ok/10 text-ok",
  warn: "border-warn/40 bg-warn/10 text-warn",
  bad: "border-bad/40 bg-bad/10 text-bad",
  info: "border-info/40 bg-info/10 text-info",
  brand: "border-brand/40 bg-brand/15 text-brand-2",
  muted: "border-line bg-surface-2 text-muted",
};
export function Badge({ tone = "muted", children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${TONES[tone]} ${className}`}>{children}</span>;
}

export function statusTone(s: string): Tone {
  if (s === "OPEN" || s === "APPROVED" || s === "PAID" || s === "BOOKED" || s === "COMPLETED") return "ok";
  if (s === "LIVE") return "bad";
  if (s === "PENDING" || s === "REVIEW" || s === "APPEALED") return "warn";
  if (s === "REJECTED" || s === "CANCELLED" || s === "BANNED") return "bad";
  return "muted";
}

export function MatchStatusBadge({ status, bookingOpen }: { status: string; bookingOpen?: boolean }) {
  if (status === "LIVE")
    return (
      <Badge tone="bad">
        <span className="live-dot mr-1" /> LIVE
      </Badge>
    );
  if (status === "OPEN" && bookingOpen === false) return <Badge tone="warn">Booking closed</Badge>;
  return <Badge tone={statusTone(status)}>{STATUS_LABEL[status] ?? status}</Badge>;
}

/** "Starts in 1h 20m" / "Starting now" countdown. */
export function Countdown({ to, className = "" }: { to: string; className?: string }) {
  const now = useNow(1000);
  const diff = new Date(to).getTime() - now;
  if (diff <= 0) return <span className={`text-xs font-semibold text-warn ${className}`}>Starting now</span>;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const text = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${String(s).padStart(2, "0")}s`;
  return <span className={`text-xs font-semibold tabular-nums ${diff < 30 * 60_000 ? "text-brand-2" : "text-muted"} ${className}`}>Starts in {text}</span>;
}

export function CopyField({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard blocked: the value is visible anyway */
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-brand/40 bg-brand/10 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[11px] text-muted">{label}</div>
        <div className="truncate font-mono text-lg font-bold tracking-wider">{value}</div>
      </div>
      <button type="button" onClick={copy} className="btn-ghost btn-sm shrink-0">
        {done ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />} {done ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/** Match / game picture with a gradient fallback when there is no image. */
export function Banner({ src, name, className = "" }: { src: string | null | undefined; name?: string | null; className?: string }) {
  const url = mediaUrl(src);
  if (url) return <img src={url} alt={name ?? ""} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  return (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2a1a10] via-surface-2 to-[#10202a] ${className}`}>
      <span className="font-display text-2xl font-bold tracking-widest text-ink/15 uppercase">{name ?? ""}</span>
    </div>
  );
}

export function Token({ value, className = "" }: { value: number | string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full bg-gradient-to-b from-brand-2 to-brand shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)]" />
      {value}
    </span>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${accent ? "text-brand-2" : ""}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

export function Notice({ tone = "warn", title, children }: { tone?: "warn" | "bad" | "ok" | "info"; title?: string; children: React.ReactNode }) {
  const cls = { warn: "border-warn/40 bg-warn/10", bad: "border-bad/40 bg-bad/10", ok: "border-ok/40 bg-ok/10", info: "border-info/40 bg-info/10" }[tone];
  const titleCls = { warn: "text-warn", bad: "text-bad", ok: "text-ok", info: "text-info" }[tone];
  return (
    <div className={`rounded-xl border p-3 text-sm ${cls}`}>
      {title && <div className={`mb-0.5 font-semibold ${titleCls}`}>{title}</div>}
      <div className="text-ink/90">{children}</div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export function Submit({ busy, children, className = "btn-primary w-full", disabled }: { busy: boolean; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return (
    <button type="submit" className={className} disabled={busy || disabled}>
      {busy && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-3 text-sm">
      <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span className="text-muted">
        Page {page} of {pages}
      </span>
      <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  );
}

export function LinkButton({ to, children, className = "btn-primary" }: { to: string; children: React.ReactNode; className?: string }) {
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
