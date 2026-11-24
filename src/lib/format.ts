const TZ = "Asia/Dhaka";

export function fmtDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d));
}
export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

/** Value for <input type="datetime-local"> shown in Bangladesh time. */
export function toLocalInput(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}
/** A datetime-local value typed in Bangladesh time (UTC+6) -> ISO string. */
export function fromLocalInput(v: string) {
  return new Date(`${v}:00+06:00`).toISOString();
}
export function dhakaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export const n = (v: number | null | undefined) => new Intl.NumberFormat("en-US").format(v ?? 0);
export const bdt = (v: number | null | undefined) => `৳${n(v)}`;

export function fmtSize(bytes: number) {
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const STATUS_LABEL: Record<string, string> = { OPEN: "Booking open", LIVE: "Live", REVIEW: "In review", COMPLETED: "Completed", CANCELLED: "Cancelled" };
export const CATEGORY_LABEL: Record<string, string> = { BR: "Battle Royale", CS: "Clash / TDM", VERSUS: "1 vs 1", OTHER: "Other" };
export const LEDGER_LABEL: Record<string, string> = {
  DEPOSIT: "Deposit", WITHDRAW: "Withdrawal", WITHDRAW_REFUND: "Withdrawal returned", ENTRY: "Entry fee", ENTRY_REFUND: "Entry refund",
  PRIZE: "Prize", BONUS: "Bonus", ADJUST: "Adjustment",
};
export const TEAM_SIZE: Record<string, number> = { SOLO: 1, DUO: 2, TRIO: 3, SQUAD: 4, "1V1": 1, "2V2": 2, "3V3": 3, "4V4": 4, "5V5": 5, "6V6": 6 };
