import type { DashboardNavKey } from "./dashboard-nav-config";

/** Ruta pública por sección del panel (App Router). */
export const DASHBOARD_NAV_PATHS: Record<DashboardNavKey, string> = {
  home: "/dashboard",
  leagues: "/leagues",
  fixture: "/fixture",
  live: "/live",
  teams: "/teams",
  players: "/players",
  venues: "/venues",
  standings: "/standings",
  discipline: "/discipline",
  reports: "/reports",
  settings: "/settings",
} as const;

const PATH_TO_NAV_KEY = Object.fromEntries(
  Object.entries(DASHBOARD_NAV_PATHS).map(([key, path]) => [path, key]),
) as Record<string, DashboardNavKey>;

export function dashboardPathForNavKey(key: DashboardNavKey): string {
  return DASHBOARD_NAV_PATHS[key];
}

export function dashboardNavKeyFromPathname(pathname: string): DashboardNavKey | null {
  return PATH_TO_NAV_KEY[pathname] ?? null;
}
