export type MyLeagueCategorySummary = {
  id: string;
  code: string;
  name: string;
  gender: "male" | "female" | "mixed" | "unspecified";
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
