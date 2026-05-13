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

/** Fila de la tabla Equipos (datos reales desde GET /api/leagues/my). */
export type MyLeaguesTeamRow = {
  id: string;
  leagueId: string;
  leagueName: string;
  name: string;
  shortName: string | null;
  playersCount: number;
  status: "active" | "inactive" | "withdrawn";
  categoryName: string | null;
  crestUrl: string | null;
};

export type DashboardMyLeaguesState =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry: () => void }
  | { status: "ready"; items: readonly MyLeaguesApiItem[]; teams: readonly MyLeaguesTeamRow[] };
