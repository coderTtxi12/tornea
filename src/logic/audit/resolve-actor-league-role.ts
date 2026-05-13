import { and, eq } from "drizzle-orm";

import type { Db } from "@/db/client";
import { leagueMembers, leagues } from "@/db/schema";

import type { LeagueMemberRole } from "./league-role";

/**
 * Rol del usuario en la liga al momento del evento: fila en `league_members`,
 * o `owner` si es `leagues.owner_user_id` sin fila de miembro (convención legacy).
 */
export async function resolveActorLeagueRole(
  db: Db,
  leagueId: string,
  actorUserId: string,
): Promise<LeagueMemberRole | null> {
  const [member] = await db
    .select({ role: leagueMembers.role })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, leagueId),
        eq(leagueMembers.userId, actorUserId),
      ),
    )
    .limit(1);

  if (member) {
    return member.role;
  }

  const [league] = await db
    .select({ ownerUserId: leagues.ownerUserId })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (league?.ownerUserId === actorUserId) {
    return "owner";
  }

  return null;
}
