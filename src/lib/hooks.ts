import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "./toast";

/**
 * Run an API action with a busy flag, a toast with the server's message and cache refresh.
 *   const { run, busy } = useAction();
 *   run("join", () => api(...), { invalidate: [["match", id]] })
 */
export function useAction() {
  const toast = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(
    async <T,>(key: string, fn: () => Promise<T>, opts: { invalidate?: unknown[][]; confirm?: string; silent?: boolean } = {}): Promise<T | undefined> => {
      if (opts.confirm && !window.confirm(opts.confirm)) return undefined;
      setBusy(key);
      try {
        const r = await fn();
        const msg = (r as { message?: string } | null)?.message;
        if (msg && !opts.silent) toast.ok(msg);
        await Promise.all((opts.invalidate ?? []).map((k) => qc.invalidateQueries({ queryKey: k })));
        return r;
      } catch (e) {
        toast.error((e as Error).message);
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [qc, toast],
  );
  return { run, busy };
}

/** Re-render every `ms` (for countdowns). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Set the browser tab title. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Admin` : "Admin Panel";
  }, [title]);
}
