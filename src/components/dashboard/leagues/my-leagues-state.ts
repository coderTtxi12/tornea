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

export type MyLeagueSeasonSummary = {
  id: string;
  name: string;
  status: string;
};

export type MyLeaguesApiItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  sportCode: string;
  sportLabel: string;
  seasonLabel: string;
  /** IANA, ej. America/Guayaquil — se guarda en `matches.timezone`. */
  timezone: string;
  seasons: MyLeagueSeasonSummary[];
  /** Temporada prioritaria (misma heurística que el resto del panel). */
  primarySeasonId: string | null;
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

/** Fila de fixture / partidos (GET /api/leagues/my/matches — lista completa; filtro/orden en cliente). */
export type MyLeaguesMatchRow = {
  id: string;
  leagueId: string;
  leagueName: string;
  seasonId: string;
  seasonName: string;
  /** ISO 8601 */
  scheduledAt: string;
  timezone: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  venueId: string | null;
  venueName: string | null;
  matchday: number | null;
  roundLabel: string | null;
  leagueCategoryId: string | null;
  categoryName: string | null;
  status: string;
  sportCode: string;
  notes: string | null;
};

/** Fila de sedes / canchas (datos reales desde GET /api/leagues/my). */
export type MyLeaguesVenueRow = {
  id: string;
  leagueId: string;
  leagueName: string;
  name: string;
  address: string | null;
  surface: string | null;
  badgeLabel: string;
  photoCount: number;
  hasAvailabilityNotes: boolean;
};

/** Fila de plantilla / jugador (datos reales desde GET /api/leagues/my). */
export type MyLeaguesPlayerRow = {
  id: string;
  playerId: string;
  leagueId: string;
  leagueName: string;
  teamId: string;
  teamName: string;
  teamShort: string | null;
  fullName: string;
  shirtNumber: number | null;
  position: string | null;
  /** ISO — alta en plantilla (`team_rosters.registered_at`). */
  registeredAt: string;
  /** Foto de perfil si está en metadata del jugador. */
  profileImageUrl?: string | null;
};

export type DashboardMyLeaguesState =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry: () => void }
  | {
      status: "ready";
      items: readonly MyLeaguesApiItem[];
      teams: readonly MyLeaguesTeamRow[];
      players: readonly MyLeaguesPlayerRow[];
      venues: readonly MyLeaguesVenueRow[];
      /** Paginación servidor (máx. 50 filas por carga); `null` si no hay más. */
      playersNextCursor: string | null;
    };
