import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagueMembers, leagues } from "@/db/schema";

import { userIsLeagueSuperuser } from "./league-dashboard-admin";

/**
 * Quita un administrador invitado (`role = admin`). Solo el superusuario de la liga.
 */
export async function removeLeagueDashboardAdmin(args: {
  leagueId: string;
  actorUserId: string;
  targetUserId: string;
}): Promise<"OK" | "FORBIDDEN" | "CANNOT_REMOVE_SUPERUSER" | "NOT_FOUND"> {
  const db = getDb();

  const [league] = await db
    .select({ ownerUserId: leagues.ownerUserId })
    .from(leagues)
    .where(eq(leagues.id, args.leagueId))
    .limit(1);
  if (!league) {
    return "NOT_FOUND";
  }

  if (!(await userIsLeagueSuperuser(db, args.leagueId, args.actorUserId))) {
    return "FORBIDDEN";
  }

  if (args.targetUserId === league.ownerUserId) {
    return "CANNOT_REMOVE_SUPERUSER";
  }

  const [row] = await db
    .select({ id: leagueMembers.id })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, args.leagueId),
        eq(leagueMembers.userId, args.targetUserId),
        eq(leagueMembers.role, "admin"),
      ),
    )
    .limit(1);

  if (!row) {
    return "NOT_FOUND";
  }

  await db.delete(leagueMembers).where(eq(leagueMembers.id, row.id));
  return "OK";
}
