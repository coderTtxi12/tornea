import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { appAuditLogs } from "@/db/schema";

import type { AppAuditFeedRow } from "./types";

/**
 * Actividad reciente para una liga (p. ej. Agenda / Pendientes).
 * Solo filas con `league_id` igual al argumento.
 */
export async function listRecentAppAuditLogsForLeague(
  leagueId: string,
  options?: { limit?: number },
): Promise<AppAuditFeedRow[]> {
  const db = getDb();
  const limit = Math.min(Math.max(options?.limit ?? 30, 1), 200);

  const rows = await db
    .select({
      id: appAuditLogs.id,
      createdAt: appAuditLogs.createdAt,
      action: appAuditLogs.action,
      entityType: appAuditLogs.entityType,
      entityId: appAuditLogs.entityId,
      summary: appAuditLogs.summary,
      metadata: appAuditLogs.metadata,
      actorUserId: appAuditLogs.actorUserId,
      actorDisplayNameSnapshot: appAuditLogs.actorDisplayNameSnapshot,
      actorEmailSnapshot: appAuditLogs.actorEmailSnapshot,
      actorLeagueRole: appAuditLogs.actorLeagueRole,
      leagueId: appAuditLogs.leagueId,
    })
    .from(appAuditLogs)
    .where(eq(appAuditLogs.leagueId, leagueId))
    .orderBy(desc(appAuditLogs.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    summary: r.summary,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    actorUserId: r.actorUserId,
    actorDisplayNameSnapshot: r.actorDisplayNameSnapshot,
    actorEmailSnapshot: r.actorEmailSnapshot,
    actorLeagueRole: r.actorLeagueRole,
    leagueId: r.leagueId,
  }));
}
