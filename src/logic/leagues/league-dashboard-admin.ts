import { and, eq, inArray } from "drizzle-orm";

import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import { leagueMembers, leagues } from "@/db/schema";

/** DB o transacción Drizzle con `.select`. */
export type LeagueQueryable = Pick<Db, "select">;

/**
 * Ligas que el usuario puede gestionar en el panel: es `owner_user_id` o tiene rol
 * `owner` / `admin` en `league_members`.
 */
export async function listManagedLeagueIdsForDashboardUser(
  userId: string,
): Promise<string[]> {
  const db = getDb();
  const owned = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.ownerUserId, userId));
  const memberRows = await db
    .select({ leagueId: leagueMembers.leagueId })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.userId, userId),
        inArray(leagueMembers.role, ["owner", "admin"]),
      ),
    );
  const ids = new Set<string>();
  for (const r of owned) ids.add(r.id);
  for (const r of memberRows) ids.add(r.leagueId);
  return [...ids];
}

export async function userCanManageLeague(
  db: LeagueQueryable,
  leagueId: string,
  userId: string,
): Promise<boolean> {
  const [league] = await db
    .select({ ownerUserId: leagues.ownerUserId })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) return false;
  if (league.ownerUserId === userId) return true;
  const [m] = await db
    .select({ id: leagueMembers.id })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, leagueId),
        eq(leagueMembers.userId, userId),
        inArray(leagueMembers.role, ["owner", "admin"]),
      ),
    )
    .limit(1);
  return !!m;
}

/** Superusuario de la liga: quien creó la organización (`leagues.owner_user_id`). */
export async function userIsLeagueSuperuser(
  db: LeagueQueryable,
  leagueId: string,
  userId: string,
): Promise<boolean> {
  const [league] = await db
    .select({ ownerUserId: leagues.ownerUserId })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  return league?.ownerUserId === userId;
}

export async function getLeagueOwnerUserId(
  db: LeagueQueryable,
  leagueId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ ownerUserId: leagues.ownerUserId })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  return row?.ownerUserId ?? null;
}
