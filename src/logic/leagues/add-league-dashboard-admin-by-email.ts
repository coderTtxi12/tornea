import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagueMembers, leagues, users } from "@/db/schema";
import { userRowHasDashboardAccess } from "@/logic/auth/dashboard-access";

import { userCanManageLeague } from "./league-dashboard-admin";

/**
 * Invita a un administrador adicional (`league_members.role = admin`).
 * El correo debe corresponder a un usuario ya en `users`. Si estaba en lista de espera
 * (`dashboard_access_granted_at` nulo), se le otorga acceso al panel en la misma operación.
 */
export async function addLeagueDashboardAdminByEmail(args: {
  leagueId: string;
  actorUserId: string;
  email: string;
}): Promise<
  | { ok: true; userId: string; grantedDashboardAccess: boolean }
  | "FORBIDDEN"
  | "LEAGUE_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "ALREADY_ADMIN"
  | "MEMBER_OTHER_ROLE"
  | "IS_SUPERUSER"
> {
  const db = getDb();
  const emailNorm = args.email.trim().toLowerCase();
  if (!emailNorm) {
    return "USER_NOT_FOUND";
  }

  const [league] = await db
    .select({ id: leagues.id, ownerUserId: leagues.ownerUserId })
    .from(leagues)
    .where(eq(leagues.id, args.leagueId))
    .limit(1);
  if (!league) {
    return "LEAGUE_NOT_FOUND";
  }

  if (!(await userCanManageLeague(db, args.leagueId, args.actorUserId))) {
    return "FORBIDDEN";
  }

  try {
    return await db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${emailNorm}`)
        .limit(1);

      if (!target) {
        throw new Error("USER_NOT_FOUND");
      }

      if (target.id === league.ownerUserId) {
        throw new Error("IS_SUPERUSER");
      }

      const [existing] = await tx
        .select({ id: leagueMembers.id, role: leagueMembers.role })
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, args.leagueId),
            eq(leagueMembers.userId, target.id),
          ),
        )
        .limit(1);

      if (existing) {
        if (existing.role === "admin" || existing.role === "owner") {
          throw new Error("ALREADY_ADMIN");
        }
        throw new Error("MEMBER_OTHER_ROLE");
      }

      const hadDashboardAccess = userRowHasDashboardAccess(target);
      const now = new Date();
      if (!hadDashboardAccess) {
        await tx
          .update(users)
          .set({
            dashboardAccessGrantedAt: now,
            updatedAt: now,
          })
          .where(eq(users.id, target.id));
      }

      await tx.insert(leagueMembers).values({
        leagueId: args.leagueId,
        userId: target.id,
        role: "admin",
        invitedByUserId: args.actorUserId,
        acceptedAt: now,
      });

      return {
        ok: true as const,
        userId: target.id,
        grantedDashboardAccess: !hadDashboardAccess,
      };
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "USER_NOT_FOUND") return "USER_NOT_FOUND";
      if (e.message === "IS_SUPERUSER") return "IS_SUPERUSER";
      if (e.message === "ALREADY_ADMIN") return "ALREADY_ADMIN";
      if (e.message === "MEMBER_OTHER_ROLE") return "MEMBER_OTHER_ROLE";
    }
    throw e;
  }
}
