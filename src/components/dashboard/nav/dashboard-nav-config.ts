/**
 * Rail del dashboard (Material Symbols Rounded).
 * Cada ítem tiene descripción mock para cabeceras de vista.
 */

export type DashboardNavKey =
  | "home"
  | "leagues"
  | "fixture"
  | "live"
  | "teams"
  | "players"
  | "venues"
  | "standings"
  | "discipline"
  | "reports"
  | "settings";

export type DashboardNavItem = {
  key: DashboardNavKey;
  label: string;
  /** Nombre del glifo: https://fonts.google.com/icons */
  symbol: string;
  mockDescription: string;
};

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  {
    key: "home",
    label: "Inicio",
    symbol: "home",
    mockDescription: "Resumen de ligas, destacados y tabla compacta.",
  },
  {
    key: "leagues",
    label: "Ligas",
    symbol: "emoji_events",
    mockDescription: "Organizaciones (tenant): estados, temporadas y formatos.",
  },
  {
    key: "fixture",
    label: "Fixture",
    symbol: "calendar_month",
    mockDescription: "Calendario por jornada — enlazado a temporadas y partidos.",
  },
  {
    key: "live",
    label: "En vivo",
    symbol: "live_tv",
    mockDescription: "Partidos live, marcador y eventos (mock).",
  },
  {
    key: "teams",
    label: "Equipos",
    symbol: "shield",
    mockDescription: "Clubes por liga e inscripción a temporada.",
  },
  {
    key: "players",
    label: "Plantillas",
    symbol: "person_play",
    mockDescription: "Jugadores y camisetas — roster por equipo/temporada.",
  },
  {
    key: "venues",
    label: "Sedes",
    symbol: "stadium",
    mockDescription: "Canchas y polideportivos usados en el calendario.",
  },
  {
    key: "standings",
    label: "Tabla",
    symbol: "leaderboard",
    mockDescription: "Clasificación (todos contra todos / grupos — mock).",
  },
  {
    key: "discipline",
    label: "Disciplina",
    symbol: "gavel",
    mockDescription: "Sanciones y suspensiones (`sanctions`, tarjetas, informes).",
  },
  {
    key: "reports",
    label: "Actas",
    symbol: "assignment",
    mockDescription: "Actas delegado, planilla arbitral, informes (`match_report_kind`).",
  },
  {
    key: "settings",
    label: "Ajustes",
    symbol: "settings",
    mockDescription: "Cuenta, notificaciones y preferencias de liga (mock).",
  },
] as const;
