/**
 * Valores del enum PostgreSQL `app_audit_action`.
 * - `create`: alta / guardar un registro nuevo
 * - `update`: edición
 * - `delete`: baja
 */
export type AppAuditAction = "create" | "update" | "delete";

/**
 * Convención de `entity_type` (texto estable, `snake_case`).
 * Ampliar según integres rutas; mantener documentado en docs/AUDIT_LOGS.md.
 */
export const AppAuditEntityType = {
  user: "user",
  dashboardAccessRequest: "dashboard_access_request",
  league: "league",
  leagueCategory: "league_category",
  team: "team",
  player: "player",
  teamRoster: "team_roster",
  season: "season",
  match: "match",
  venue: "venue",
  /** Árbitro de contacto en `league_referees` (directorio por liga). */
  leagueReferee: "league_referee",
  sanction: "sanction",
  leagueMember: "league_member",
} as const;

export type AppAuditEntityTypeKey = keyof typeof AppAuditEntityType;

export type AppAuditEntityTypeValue =
  (typeof AppAuditEntityType)[AppAuditEntityTypeKey];

export type AppAuditFeedRow = {
  id: string;
  createdAt: string;
  action: AppAuditAction;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  actorUserId: string | null;
  actorDisplayNameSnapshot: string | null;
  actorEmailSnapshot: string | null;
  actorLeagueRole: string | null;
  leagueId: string | null;
};
