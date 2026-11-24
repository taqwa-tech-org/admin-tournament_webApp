import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth, type Staff } from "@/lib/auth";
import { useTitle } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import { Field, Notice, Submit } from "@/components/ui";

export function LoginPage() {
  useTitle("Log in");
  const { setUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await api<{ user: Staff }>("/staff/auth/login", { body: { phone: f.get("phone"), password: f.get("password") } });
      setUser(r.user);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="bg-arena flex min-h-dvh items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2">
          <img src="/icon.svg" alt="" className="h-9 w-9" />
          <div>
            <h1 className="font-display text-2xl font-bold">Admin panel</h1>
            <p className="text-xs text-muted">Managers, Admins and the Super Admin</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Mobile number">
            <input className="input" name="phone" inputMode="tel" autoComplete="username" placeholder="01XXXXXXXXX" required />
          </Field>
          <Field label="Password">
            <input className="input" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Submit busy={busy}>Log in</Submit>
        </form>
      </div>
    </div>
  );
}

export function ChangePasswordPage({ forced }: { forced?: boolean }) {
  useTitle("Change password");
  const { setUser, logout } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    try {
      const r = await api<{ user: Staff; message: string }>("/staff/auth/change-password", { body: { current: f.get("current"), next: f.get("next"), confirm: f.get("confirm") } });
      setUser(r.user);
      toast.ok(r.message);
      form.reset();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const body = (
    <div className="card w-full max-w-md space-y-4 p-6">
      <h1 className="font-display text-2xl font-bold">Change password</h1>
      {forced && <Notice>Choose your own password before you continue (minimum 10 characters).</Notice>}
      <form onSubmit={submit} className="space-y-3">
        <Field label={forced ? "Temporary password" : "Current password"}>
          <input className="input" name="current" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="New password (10+ characters)">
          <input className="input" name="next" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <Field label="Repeat new password">
          <input className="input" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <Submit busy={busy}>Save password</Submit>
      </form>
      {forced && (
        <button onClick={logout} className="w-full text-center text-xs text-muted hover:text-ink">
          Log out
        </button>
      )}
    </div>
  );
  return forced ? <div className="bg-arena flex min-h-dvh items-center justify-center p-4">{body}</div> : body;
}
