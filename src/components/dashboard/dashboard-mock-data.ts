/**
 * Static placeholders for the dashboard UI mockup only — not loaded from the API.
 */

export type MockTeam = {
  id: string;
  name: string;
  shortName: string;
  playersCount: number;
  status: "active" | "inactive";
};

/** Placeholder for “command center” hero — optional per league */
export type MockNextMatch = {
  homeTeam: string;
  awayTeam: string;
  kickoffLabel: string;
  venueShort: string;
};

export type MockLeague = {
  id: string;
  name: string;
  sportLabel: string;
  seasonLabel: string;
  status: "active" | "draft" | "archived";
  stats: {
    matchesPlayed: number;
    matchesScheduled: number;
    teamsTotal: number;
    playersTotal: number;
    goalsScored: number;
  };
  teams: MockTeam[];
  /** When absent, UI treats as “no upcoming match in mock” */
  nextMatch?: MockNextMatch | null;
};

export const MOCK_LEAGUES: MockLeague[] = [
  {
    id: "l-1",
    name: "Liga Barrial Norte",
    sportLabel: "Fútbol",
    seasonLabel: "Clausura 2026",
    status: "active",
    stats: {
      matchesPlayed: 48,
      matchesScheduled: 12,
      teamsTotal: 10,
      playersTotal: 186,
      goalsScored: 142,
    },
    nextMatch: {
      homeTeam: "Atlético El Bosque",
      awayTeam: "Unión San José",
      kickoffLabel: "Sáb 14 jun · 17:00",
      venueShort: "Cancha sintética Norte",
    },
    teams: [
      {
        id: "t-1",
        name: "Atlético El Bosque",
        shortName: "BOS",
        playersCount: 20,
        status: "active",
      },
      {
        id: "t-2",
        name: "Unión San José",
        shortName: "USJ",
        playersCount: 18,
        status: "active",
      },
      {
        id: "t-3",
        name: "Deportivo 12 de Octubre",
        shortName: "12O",
        playersCount: 19,
        status: "active",
      },
      {
        id: "t-4",
        name: "Estrella del Río",
        shortName: "EDR",
        playersCount: 17,
        status: "inactive",
      },
    ],
  },
  {
    id: "l-2",
    name: "Copa Empresarial Quito",
    sportLabel: "Fútbol 7",
    seasonLabel: "Edición invierno",
    status: "active",
    stats: {
      matchesPlayed: 22,
      matchesScheduled: 6,
      teamsTotal: 8,
      playersTotal: 96,
      goalsScored: 81,
    },
    nextMatch: {
      homeTeam: "Café Andino",
      awayTeam: "Logística Sur",
      kickoffLabel: "Dom 15 jun · 09:30",
      venueShort: "Polideportivo Centro",
    },
    teams: [
      {
        id: "t-5",
        name: "Tornea FC Oficina",
        shortName: "TOR",
        playersCount: 12,
        status: "active",
      },
      {
        id: "t-6",
        name: "Café Andino",
        shortName: "CAF",
        playersCount: 14,
        status: "active",
      },
      {
        id: "t-7",
        name: "Logística Sur",
        shortName: "LOG",
        playersCount: 11,
        status: "active",
      },
    ],
  },
  {
    id: "l-3",
    name: "Escuelas formativas U-15",
    sportLabel: "Fútbol",
    seasonLabel: "Apertura (borrador)",
    status: "draft",
    stats: {
      matchesPlayed: 0,
      matchesScheduled: 0,
      teamsTotal: 4,
      playersTotal: 72,
      goalsScored: 0,
    },
    teams: [
      {
        id: "t-8",
        name: "Cantera Norte",
        shortName: "CNR",
        playersCount: 18,
        status: "active",
      },
      {
        id: "t-9",
        name: "Cantera Centro",
        shortName: "CCE",
        playersCount: 19,
        status: "active",
      },
    ],
  },
];

/** Fila de fixture — alineado a `matches` + `venues` en schema. */
export type MockFixtureRow = {
  id: string;
  dayLabel: string;
  time: string;
  home: string;
  away: string;
  venue: string;
  matchStatus: "scheduled" | "live" | "finished" | "postponed";
  roundLabel: string;
};

export const MOCK_FIXTURE_ROWS: MockFixtureRow[] = [
  {
    id: "m-1",
    dayLabel: "Sáb 14 jun",
    time: "17:00",
    home: "Atlético El Bosque",
    away: "Unión San José",
    venue: "Cancha sintética Norte",
    matchStatus: "scheduled",
    roundLabel: "Fecha 12",
  },
  {
    id: "m-2",
    dayLabel: "Sáb 14 jun",
    time: "19:30",
    home: "Café Andino",
    away: "Logística Sur",
    venue: "Polideportivo Centro",
    matchStatus: "scheduled",
    roundLabel: "Fecha 3 · Copa",
  },
  {
    id: "m-3",
    dayLabel: "Dom 15 jun",
    time: "09:30",
    home: "Tornea FC Oficina",
    away: "Estrella del Río",
    venue: "Polideportivo Centro",
    matchStatus: "scheduled",
    roundLabel: "Fecha 4 · Copa",
  },
  {
    id: "m-4",
    dayLabel: "Dom 15 jun",
    time: "11:00",
    home: "Deportivo 12 de Octubre",
    away: "Estrella del Río",
    venue: "Estadio Juan Montalvo",
    matchStatus: "finished",
    roundLabel: "Fecha 11",
  },
];

export type MockLiveMatch = {
  id: string;
  home: string;
  away: string;
  score: string;
  minute: string;
  period: string;
  venue: string;
};

export const MOCK_LIVE_MATCHES: MockLiveMatch[] = [
  {
    id: "live-1",
    home: "Unión San José",
    away: "Atlético El Bosque",
    score: "1 — 1",
    minute: "67′",
    period: "2.º tiempo",
    venue: "Sintética Norte",
  },
];

export type MockVenue = {
  id: string;
  name: string;
  shortName: string;
  surface: string;
  leaguesUsing: number;
};

export const MOCK_VENUES: MockVenue[] = [
  {
    id: "v-1",
    name: "Cancha sintética Norte",
    shortName: "Norte",
    surface: "Sintético FIFA 2★",
    leaguesUsing: 2,
  },
  {
    id: "v-2",
    name: "Polideportivo Centro",
    shortName: "Centro",
    surface: "Parquet / polivalente",
    leaguesUsing: 2,
  },
  {
    id: "v-3",
    name: "Estadio Juan Montalvo",
    shortName: "Montalvo",
    surface: "Natural híbrido",
    leaguesUsing: 1,
  },
];

export type MockPlayerRow = {
  id: string;
  name: string;
  teamShort: string;
  position: string;
  number: number;
};

export const MOCK_PLAYER_ROWS: MockPlayerRow[] = [
  { id: "p-1", name: "Valdivieso · L.", teamShort: "BOS", position: "DEL", number: 10 },
  { id: "p-2", name: "Ayora · M.", teamShort: "BOS", position: "MC", number: 8 },
  { id: "p-3", name: "Carrera · D.", teamShort: "USJ", position: "DEF", number: 4 },
  { id: "p-4", name: "Pérez · J.", teamShort: "USJ", position: "POR", number: 1 },
  { id: "p-5", name: "Flores · K.", teamShort: "12O", position: "DEL", number: 9 },
  { id: "p-6", name: "Mendieta · R.", teamShort: "EDR", position: "MC", number: 21 },
];

export type MockStandingRow = {
  place: number;
  team: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  pts: number;
};

export const MOCK_STANDINGS_TABLE: MockStandingRow[] = [
  { place: 1, team: "Atlético El Bosque", pj: 11, pg: 10, pe: 1, pp: 0, gf: 28, gc: 9, pts: 31 },
  { place: 2, team: "Unión San José", pj: 11, pg: 9, pe: 1, pp: 1, gf: 24, gc: 10, pts: 28 },
  { place: 3, team: "Deportivo 12 de Octubre", pj: 11, pg: 7, pe: 2, pp: 2, gf: 19, gc: 14, pts: 23 },
  { place: 4, team: "Estrella del Río", pj: 11, pg: 5, pe: 1, pp: 5, gf: 15, gc: 20, pts: 16 },
  { place: 5, team: "Café Andino", pj: 10, pg: 4, pe: 2, pp: 4, gf: 14, gc: 18, pts: 14 },
];

export type MockSanction = {
  id: string;
  subject: string;
  kind: string;
  scope: string;
  status: string;
  linkedMatch: string;
};

export const MOCK_SANCTIONS: MockSanction[] = [
  {
    id: "s-1",
    subject: "Carrera · D. (USJ)",
    kind: "Suspensión",
    scope: "2 fechas",
    status: "Activa",
    linkedMatch: "12 oct vs EDR · J11",
  },
  {
    id: "s-2",
    subject: "Club · Tornea FC",
    kind: "Amonestación económica",
    scope: "$120",
    status: "Pendiente pago",
    linkedMatch: "Copa Empresarial · J2",
  },
  {
    id: "s-3",
    subject: "Cuerpo arbitral (informe)",
    kind: "Advertencia deportiva",
    scope: "Registro",
    status: "Cumplida",
    linkedMatch: "LBN · J9",
  },
];

export type MockMatchReport = {
  id: string;
  matchLabel: string;
  kind: string;
  authorRole: string;
  updatedLabel: string;
  locked: boolean;
};

export const MOCK_MATCH_REPORTS: MockMatchReport[] = [
  {
    id: "r-1",
    matchLabel: "El Bosque vs Unión · J11",
    kind: "Acta de delegado",
    authorRole: "Delegado local",
    updatedLabel: "Hace 2 h",
    locked: false,
  },
  {
    id: "r-2",
    matchLabel: "Café Andino vs Logística · Copa J2",
    kind: "Planilla árbitral",
    authorRole: "Central",
    updatedLabel: "Ayer",
    locked: true,
  },
  {
    id: "r-3",
    matchLabel: "12 oct vs Estrella · J10",
    kind: "Informe prensa",
    authorRole: "Prensa Tornea",
    updatedLabel: "Dom 8 jun",
    locked: true,
  },
];

/** Resultado reciente — `crewLabels` simula acta / oficiales (no jugadores genéricos). */
export type MockResultRow = {
  id: string;
  title: string;
  score: string;
  badge: "final" | "draw" | "upcoming";
  crewLabels?: string[];
};

export const MOCK_RECENT_RESULTS: MockResultRow[] = [
  {
    id: "res-1",
    title: "El Bosque vs Unión San José",
    score: "2 — 1",
    badge: "final",
    crewLabels: ["Árbitro", "4.º", "Del", "Med"],
  },
  {
    id: "res-2",
    title: "Café Andino vs Logística Sur",
    score: "0 — 0",
    badge: "draw",
    crewLabels: ["Árbitro", "4.º", "Del"],
  },
  {
    id: "res-3",
    title: "Tornea FC vs Estrella del Río",
    score: "—",
    badge: "upcoming",
    crewLabels: ["Designación", "TV"],
  },
];

/** Tareas operativas del carril derecho (mock). */
export type MockRailTask = {
  id: string;
  label: string;
  meta: string;
  tone: "urgent" | "default";
};

export const MOCK_RAIL_TASKS: MockRailTask[] = [
  {
    id: "op-1",
    label: "Cerrar acta de delegado",
    meta: "El Bosque vs Unión · J11",
    tone: "urgent",
  },
  {
    id: "op-2",
    label: "Confirmar designación arbitral",
    meta: "Copa · CAF vs LOG",
    tone: "default",
  },
  {
    id: "op-3",
    label: "Registrar pago de multa",
    meta: "Tornea FC · $120",
    tone: "urgent",
  },
];

export type MockRailActivityLine = {
  id: string;
  text: string;
  t: string;
};

export const MOCK_RAIL_ACTIVITY: MockRailActivityLine[] = [
  { id: "a-1", text: "Marcador cargado · 12 oct vs EDR", t: "Hace 35 min" },
  { id: "a-2", text: "Fixture publicado · fecha 12", t: "Hace 2 h" },
  { id: "a-3", text: "Sanción registrada · Carrera D.", t: "Ayer" },
];
