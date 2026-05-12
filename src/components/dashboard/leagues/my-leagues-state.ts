export type MyLeagueCategorySummary = {
  id: string;
  code: string;
  name: string;
  gender: "male" | "female" | "mixed" | "unspecified";
  ageMin: number | null;
  ageMax: number | null;
  birthYearMin: number | null;
  birthYearMax: number | null;
  minTeamsToStart: number | null;
  /** ISO string. */
  createdAt: string;
};

export type MyLeaguesApiItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  sportCode: string;
  sportLabel: string;
  seasonLabel: string;
  seasonFormat: string | null;
  teamsTotal: number;
  matchesPlayed: number;
  matchesPending: number;
  shieldUrl: string | null;
  categories: MyLeagueCategorySummary[];
};

export type DashboardMyLeaguesState =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry: () => void }
  | { status: "ready"; items: readonly MyLeaguesApiItem[] };
