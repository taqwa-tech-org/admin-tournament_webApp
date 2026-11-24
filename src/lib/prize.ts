// Same prize rules as the server (server/src/services/prize.service.ts). The server is the
// authority; this copy only powers previews and the profit calculator in the panel.

export type Reward = { type: "PLACEMENT" | "PER_KILL" | "MANUAL"; label: string; tokens: number; place: number | null; placeTo: number | null; condition: string | null };

export function computePrize(rules: Reward[], input: { kills: number; placement: number; claims: number[] }) {
  let total = 0;
  const lines: string[] = [];
  rules.forEach((r, i) => {
    let add = 0;
    if (r.type === "PLACEMENT" && r.place) {
      const to = r.placeTo && r.placeTo >= r.place ? r.placeTo : r.place;
      if (input.placement >= r.place && input.placement <= to) add = r.tokens;
    } else if (r.type === "PER_KILL") add = Math.max(0, input.kills) * r.tokens;
    else if (r.type === "MANUAL" && input.claims.includes(i)) add = r.tokens;
    if (add > 0) {
      total += add;
      lines.push(`${r.label}: +${add}`);
    }
  });
  return { total, lines };
}

export function describeRule(r: Reward) {
  if (r.type === "PLACEMENT") return r.placeTo && r.place && r.placeTo > r.place ? `#${r.place}–#${r.placeTo}: ${r.tokens} each` : `#${r.place}: ${r.tokens}`;
  if (r.type === "PER_KILL") return `${r.tokens} per kill`;
  return `${r.condition ?? r.label}: ${r.tokens}`;
}

/**
 * Profit check for a template: what comes in vs the most that can go out.
 * Worst case per-kill payout assumes every eliminated player was killed (players - 1 kills),
 * real matches pay less because many players die to the zone.
 */
export function profitCheck(t: { rewards: Reward[]; slots: number; minEntries: number; entryFee: number; extraFee: number; teamSize: number; commissionPct: number }) {
  const feePerEntry = (t.entryFee + t.extraFee) * t.teamSize;
  const scenario = (entries: number) => {
    const players = entries * t.teamSize;
    const income = feePerEntry * entries;
    let fixed = 0;
    let perKill = 0;
    for (const r of t.rewards) {
      if (r.type === "PLACEMENT" && r.place) {
        const last = Math.min(r.placeTo && r.placeTo >= r.place ? r.placeTo : r.place, entries);
        if (last >= r.place) fixed += r.tokens * (last - r.place + 1);
      } else if (r.type === "PER_KILL") perKill += r.tokens;
      else fixed += r.tokens;
    }
    const maxKills = Math.max(0, players - 1);
    const typicalKills = Math.round(maxKills * 0.7);
    const worst = fixed + perKill * maxKills;
    const typical = fixed + perKill * typicalKills;
    return { entries, players, income, worst, typical, worstMargin: income - worst, typicalMargin: income - typical };
  };
  return { full: scenario(t.slots), min: scenario(Math.max(1, t.minEntries || t.slots)), feePerEntry };
}
