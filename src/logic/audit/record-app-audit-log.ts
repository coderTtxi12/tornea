import { eq } from "drizzle-orm";

import { getDb, type Db } from "@/db/client";
import { appAuditLogs, users } from "@/db/schema";

import type { LeagueMemberRole } from "./league-role";
import { resolveActorLeagueRole } from "./resolve-actor-league-role";
import type { AppAuditAction } from "./types";

export type RecordAppAuditLogInput = {
  actorUserId: string;
  action: AppAuditAction;
  /** Ver convención en `AppAuditEntityType` / docs/AUDIT_LOGS.md */
  entityType: string;
  entityId?: string | null;
  /** Línea corta para feeds (“Actividad reciente”). */
  summary: string;
  metadata?: Record<string, unknown>;
  leagueId?: string | null;
  /**
   * Rol en la liga en el momento del evento.
   * `undefined` + `leagueId` → se infiere de `league_members` o dueño de liga.
   * `null` → no inferir (guardar `actor_league_role` nulo).
   */
  actorLeagueRole?: LeagueMemberRole | null;
};

export type RecordAppAuditLogOptions = {
  /** Si es true, errores se registran en consola y no se relanzan. */
  swallowErrors?: boolean;
};

async function loadActorSnapshots(
  db: Db,
  actorUserId: string,
): Promise<{
  displayName: string | null;
  email: string | null;
}> {
  const [row] = await db
    .select({
      displayName: users.displayName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, actorUserId))
    .limit(1);
  return {
    displayName: row?.displayName ?? null,
    email: row?.email ?? null,
  };
}

function resolveRoleForInsert(
  input: RecordAppAuditLogInput,
  inferred: LeagueMemberRole | null,
): LeagueMemberRole | null {
  if (!input.leagueId) {
    return null;
  }
  if (input.actorLeagueRole === undefined) {
    return inferred;
  }
  return input.actorLeagueRole;
}

/**
 * Inserta una fila en `app_audit_logs`. Pensado para llamarse desde handlers
 * de API tras mutaciones exitosas.
 */
export async function recordAppAuditLog(
  input: RecordAppAuditLogInput,
  options?: RecordAppAuditLogOptions,
): Promise<{ id: string } | null> {
  try {
    const db = getDb();
    const { displayName, email } = await loadActorSnapshots(db, input.actorUserId);

    let inferred: LeagueMemberRole | null = null;
    if (input.leagueId && input.actorLeagueRole === undefined) {
      inferred = await resolveActorLeagueRole(db, input.leagueId, input.actorUserId);
    }

    const resolvedRole = resolveRoleForInsert(input, inferred);

    const [inserted] = await db
      .insert(appAuditLogs)
      .values({
        actorUserId: input.actorUserId,
        actorDisplayNameSnapshot: displayName,
        actorEmailSnapshot: email,
        actorLeagueRole: resolvedRole,
        leagueId: input.leagueId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        metadata: input.metadata ?? {},
      })
      .returning({ id: appAuditLogs.id });

    return inserted ? { id: inserted.id } : null;
  } catch (e) {
    if (options?.swallowErrors) {
      console.error("[recordAppAuditLog]", e);
      return null;
    }
    throw e;
  }
}
