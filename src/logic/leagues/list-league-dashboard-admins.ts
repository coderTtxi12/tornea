import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagueMembers, leagues, users } from "@/db/schema";

export type LeagueDashboardAdminRow = {
  userId: string;
  email: string;
  displayName: string | null;
  /** Rol en `league_members` (el superusuario suele tener `owner`). */
  memberRole: "owner" | "admin";
  isSuperuser: boolean;
  createdAt: string;
};

export async function listLeagueDashboardAdmins(leagueId: string): Promise<{
  superuserUserId: string;
  admins: LeagueDashboardAdminRow[];
}> {
  const db = getDb();

  const [league] = await db
    .select({ ownerUserId: leagues.ownerUserId })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (!league) {
    throw new Error("LEAGUE_NOT_FOUND");
  }

  const superuserUserId = league.ownerUserId;

  const rows = await db
    .select({
      userId: leagueMembers.userId,
      role: leagueMembers.role,
      createdAt: leagueMembers.createdAt,
      email: users.email,
      displayName: users.displayName,
    })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .where(
      and(
        eq(leagueMembers.leagueId, leagueId),
        inArray(leagueMembers.role, ["owner", "admin"]),
      ),
    )
    .orderBy(asc(users.email));

  let admins: LeagueDashboardAdminRow[] = rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    displayName: r.displayName,
    memberRole: r.role as "owner" | "admin",
    isSuperuser: r.userId === superuserUserId,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? ""),
  }));

  const listedSuper = admins.some((a) => a.userId === superuserUserId);
  if (!listedSuper) {
    const [u] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, superuserUserId))
      .limit(1);
    if (u) {
      admins = [
        {
          userId: u.id,
          email: u.email,
          displayName: u.displayName,
          memberRole: "owner",
          isSuperuser: true,
          createdAt:
            u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt ?? ""),
        },
        ...admins,
      ];
    }
  }

  admins.sort((a, b) => {
    if (a.isSuperuser !== b.isSuperuser) return a.isSuperuser ? -1 : 1;
    return a.email.localeCompare(b.email, "es");
  });

  return { superuserUserId, admins };
}
