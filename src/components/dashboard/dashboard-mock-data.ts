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
