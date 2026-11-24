import type { Reward } from "./prize";

export type MatchCard = {
  id: string;
  title: string;
  status: "OPEN" | "LIVE" | "REVIEW" | "COMPLETED" | "CANCELLED";
  startAt: string;
  game: { id: string; name: string; slug: string };
  versionName: string | null;
  modeName: string;
  modeCategory: string;
  mapName: string | null;
  format: string;
  teamSize: number;
  slots: number;
  booked: number;
  minEntries: number;
  entryFee: number;
  entryPerTeam: number;
  baseFee: number;
  extraFee: number;
  image: string | null;
  isFeatured: boolean;
  rewards: Reward[];
  prize: { top: number; fixed: number; perKill: number };
  rulesText: string;
  bookingOpen: boolean;
  manager: { id: string; name: string } | null;
};

export type Msg = { ok: true; message: string };
export type Paged = { page: number; limit: number; total: number };
