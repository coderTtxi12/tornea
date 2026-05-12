/**
 * Configuración del rail del dashboard (Material Symbols Rounded).
 * Mantiene claves tipadas para el layout principal.
 */

export type DashboardNavKey = "home" | "leagues" | "pitch" | "teams" | "settings";

export type DashboardNavItem = {
  key: DashboardNavKey;
  label: string;
  /** Nombre del glifo: https://fonts.google.com/icons */
  symbol: string;
};

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { key: "home", label: "Inicio", symbol: "home" },
  { key: "leagues", label: "Competencias", symbol: "emoji_events" },
  { key: "pitch", label: "Cancha / en vivo", symbol: "sports_soccer" },
  { key: "teams", label: "Equipos", symbol: "groups" },
  { key: "settings", label: "Ajustes", symbol: "settings" },
] as const;
