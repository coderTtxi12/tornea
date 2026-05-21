import { DASHBOARD_NAV_PATHS } from "./dashboard-routes";

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
  href: string;
  label: string;
  /** Nombre del glifo: https://fonts.google.com/icons */
  symbol: string;
  mockDescription: string;
};

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  {
    key: "home",
    href: DASHBOARD_NAV_PATHS.home,
    label: "Inicio",
    symbol: "home",
    mockDescription: "Resumen de ligas, destacados y tabla compacta.",
  },
  {
    key: "leagues",
    href: DASHBOARD_NAV_PATHS.leagues,
    label: "Ligas",
    symbol: "emoji_events",
    mockDescription: "Organizaciones (tenant): estados, temporadas y formatos.",
  },
  {
    key: "fixture",
    href: DASHBOARD_NAV_PATHS.fixture,
    label: "Fixture",
    symbol: "calendar_month",
    mockDescription: "Calendario por jornada — enlazado a temporadas y partidos.",
  },
  {
    key: "live",
    href: DASHBOARD_NAV_PATHS.live,
    label: "En vivo",
    symbol: "live_tv",
    mockDescription: "Partidos live, marcador y eventos (mock).",
  },
  {
    key: "teams",
    href: DASHBOARD_NAV_PATHS.teams,
    label: "Equipos",
    symbol: "shield",
    mockDescription: "Clubes por liga e inscripción a temporada.",
  },
  {
    key: "players",
    href: DASHBOARD_NAV_PATHS.players,
    label: "Plantillas",
    symbol: "person_play",
    mockDescription: "Jugadores y camisetas — roster por equipo/temporada.",
  },
  {
    key: "venues",
    href: DASHBOARD_NAV_PATHS.venues,
    label: "Sedes",
    symbol: "stadium",
    mockDescription: "Canchas y polideportivos usados en el calendario.",
  },
  {
    key: "standings",
    href: DASHBOARD_NAV_PATHS.standings,
    label: "Tabla",
    symbol: "leaderboard",
    mockDescription: "Clasificación (todos contra todos / grupos — mock).",
  },
  {
    key: "discipline",
    href: DASHBOARD_NAV_PATHS.discipline,
    label: "Disciplina",
    symbol: "gavel",
    mockDescription: "Sanciones y suspensiones (`sanctions`, tarjetas, informes).",
  },
  {
    key: "reports",
    href: DASHBOARD_NAV_PATHS.reports,
    label: "Actas",
    symbol: "assignment",
    mockDescription: "Actas delegado, planilla arbitral, informes (`match_report_kind`).",
  },
  {
    key: "settings",
    href: DASHBOARD_NAV_PATHS.settings,
    label: "Ajustes",
    symbol: "settings",
    mockDescription: "Cuenta, notificaciones y preferencias de liga (mock).",
  },
] as const;
