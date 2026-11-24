import { api } from "@/lib/api";
import { useAction, useTitle } from "@/lib/hooks";
import type { Msg } from "@/lib/types";
import { Load, formObject, useGet } from "@/components/kit";
import { Field, Notice, PageTitle, Submit } from "@/components/ui";

type S = Record<string, string | number | boolean>;

type Def = { key: string; label: string; hint?: string; type?: "number" | "text" | "textarea" | "bool" };
const GROUPS: { title: string; note?: string; fields: Def[] }[] = [
  {
    title: "Brand",
    fields: [
      { key: "siteName", label: "Site name", hint: "Shown in the player site header." },
      { key: "announcement", label: "Announcement bar", hint: "Short message at the top of the player site. Leave empty to hide.", type: "textarea" },
    ],
  },
  {
    title: "Money",
    note: "1 token = this many taka. Set it once before launch: changing it later changes the value of every balance.",
    fields: [
      { key: "tokenPriceBdt", label: "Token price (BDT)", type: "number" },
      { key: "minDepositBdt", label: "Minimum deposit (BDT)", type: "number" },
      { key: "minWithdrawTokens", label: "Minimum withdrawal (tokens)", type: "number" },
      { key: "withdrawFeePct", label: "Withdrawal fee (%)", hint: "Covers your cash-out charges. 0 = free.", type: "number" },
      { key: "managerSharePct", label: "Default manager share (% of commission)", type: "number" },
    ],
  },
  {
    title: "Deposit accounts (players send money here)",
    fields: [
      { key: "depositBkashNumber", label: "bKash number" },
      { key: "depositNagadNumber", label: "Nagad number" },
      { key: "depositRocketNumber", label: "Rocket number" },
      { key: "depositUpayNumber", label: "Upay number" },
      { key: "depositInstructions", label: "Deposit instructions", type: "textarea" },
    ],
  },
  {
    title: "Matches",
    fields: [
      { key: "roomRevealMinutes", label: "Show room details (minutes before start)", type: "number" },
      { key: "submissionWindowMinutes", label: "Result submission window (minutes after start)", hint: "Later submissions are flagged for the reviewer.", type: "number" },
      { key: "suspendMaxDays", label: "Longest suspension a manager can give (days)", type: "number" },
    ],
  },
  {
    title: "Referral program",
    fields: [
      { key: "referralEnabled", label: "Referral program on", type: "bool" },
      { key: "referralBonusTokens", label: "Bonus for the inviter (tokens)", type: "number" },
      { key: "referralNewUserBonusTokens", label: "Bonus for the new player (tokens)", type: "number" },
    ],
  },
  {
    title: "Support links (shown in the footer)",
    fields: [
      { key: "supportWhatsapp", label: "WhatsApp number", hint: "With country code, e.g. 8801XXXXXXXXX" },
      { key: "supportTelegram", label: "Telegram link" },
      { key: "supportFacebook", label: "Facebook page link" },
      { key: "supportPhone", label: "Helpline number" },
    ],
  },
];

export default function SettingsPage() {
  useTitle("Settings");
  const q = useGet<{ settings: S }>("/admin/settings");
  const { run, busy } = useAction();
  return (
    <>
      <PageTitle title="Settings" sub="Business rules for the whole platform. Every change is recorded in the audit log." />
      <Load q={q}>
        {(d) => (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = formObject(e.currentTarget);
              const body: Record<string, unknown> = { ...f, referralEnabled: f.referralEnabled === "on" };
              run("save", () => api<Msg>("/admin/settings", { method: "PUT", body }), { invalidate: [["/admin/settings"]] });
            }}
          >
            {GROUPS.map((g) => (
              <section key={g.title} className="card space-y-3">
                <h2 className="font-semibold">{g.title}</h2>
                {g.note && <Notice>{g.note}</Notice>}
                <div className="grid gap-3 sm:grid-cols-2">
                  {g.fields.map((fd) =>
                    fd.type === "bool" ? (
                      <label key={fd.key} className="flex items-center gap-2 text-sm sm:col-span-2">
                        <input type="checkbox" name={fd.key} defaultChecked={!!d.settings[fd.key]} className="accent-[var(--color-brand)]" /> {fd.label}
                      </label>
                    ) : fd.type === "textarea" ? (
                      <div key={fd.key} className="sm:col-span-2">
                        <Field label={fd.label} hint={fd.hint}>
                          <textarea className="input" name={fd.key} rows={2} defaultValue={String(d.settings[fd.key] ?? "")} />
                        </Field>
                      </div>
                    ) : (
                      <Field key={fd.key} label={fd.label} hint={fd.hint}>
                        <input className="input" name={fd.key} type={fd.type === "number" ? "number" : "text"} defaultValue={String(d.settings[fd.key] ?? "")} />
                      </Field>
                    ),
                  )}
                </div>
              </section>
            ))}
            <div className="sticky bottom-3">
              <Submit busy={busy === "save"} className="btn-primary w-full shadow-2xl">
                Save settings
              </Submit>
            </div>
          </form>
        )}
      </Load>
    </>
  );
}
