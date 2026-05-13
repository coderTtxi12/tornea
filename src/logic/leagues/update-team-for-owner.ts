import { and, eq, ne, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  leagueCategories,
  leagues,
  seasonTeams,
  teams,
} from "@/db/schema";

import type { TeamRegistrationContacts } from "./create-team-in-league";
import { ensureTargetSeasonIdForLeagueTx } from "./create-team-in-league";

function deriveShortName(teamName: string): string {
  const words = teamName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials = words
    .slice(0, 4)
    .map((w) => (w[0]?.toUpperCase() ?? ""))
    .join("");
  const base = initials || "EQ";
  return base.slice(0, 8);
}

function isPostgresUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "23505"
  );
}

function mergeSeasonTeamMetadata(
  prev: unknown,
  contacts: TeamRegistrationContacts,
): Record<string, unknown> {
  const base =
    prev && typeof prev === "object" && !Array.isArray(prev)
      ? { ...(prev as Record<string, unknown>) }
      : {};
  return {
    ...base,
    registrationContacts: contacts,
  };
}

/**
 * Actualiza `teams` + inscripción en temporada objetivo (`season_teams`). Solo el dueño.
 */
export async function updateTeamForOwner(args: {
  ownerUserId: string;
  leagueId: string;
  teamId: string;
  teamName: string;
  teamStatus: "active" | "inactive" | "withdrawn";
  leagueCategoryId: string;
  contacts: TeamRegistrationContacts;
}): Promise<void> {
  const db = getDb();
  const nameTrim = args.teamName.trim();

  try {
    await db.transaction(async (tx) => {
      const owner = await tx
        .select({ id: leagues.id })
        .from(leagues)
        .where(and(eq(leagues.id, args.leagueId), eq(leagues.ownerUserId, args.ownerUserId)))
        .limit(1);

      if (!owner[0]) {
        throw new Error("FORBIDDEN");
      }

      const [teamRow] = await tx
        .select({ id: teams.id })
        .from(teams)
        .where(and(eq(teams.id, args.teamId), eq(teams.leagueId, args.leagueId)))
        .limit(1);

      if (!teamRow) {
        throw new Error("NOT_FOUND");
      }

      const cat = await tx
        .select({ id: leagueCategories.id })
        .from(leagueCategories)
        .where(
          and(
            eq(leagueCategories.id, args.leagueCategoryId),
            eq(leagueCategories.leagueId, args.leagueId),
          ),
        )
        .limit(1);

      if (!cat[0]) {
        throw new Error("BAD_CATEGORY");
      }

      const dup = await tx
        .select({ id: teams.id })
        .from(teams)
        .where(
          and(
            eq(teams.leagueId, args.leagueId),
            ne(teams.id, args.teamId),
            sql`lower(${teams.name}) = lower(${nameTrim})`,
          ),
        )
        .limit(1);

      if (dup[0]) {
        throw new Error("DUPLICATE_TEAM_NAME");
      }

      await tx
        .update(teams)
        .set({
          name: nameTrim,
          shortName: deriveShortName(nameTrim),
          status: args.teamStatus,
          updatedAt: new Date(),
        })
        .where(eq(teams.id, args.teamId));

      const seasonId = await ensureTargetSeasonIdForLeagueTx(tx, args.leagueId);

      const [existingSt] = await tx
        .select({
          id: seasonTeams.id,
          metadata: seasonTeams.metadata,
        })
        .from(seasonTeams)
        .where(and(eq(seasonTeams.teamId, args.teamId), eq(seasonTeams.seasonId, seasonId)))
        .limit(1);

      const nextMeta = mergeSeasonTeamMetadata(
        existingSt?.metadata,
        args.contacts,
      );

      if (existingSt) {
        await tx
          .update(seasonTeams)
          .set({
            leagueCategoryId: args.leagueCategoryId,
            metadata: nextMeta,
            updatedAt: new Date(),
          })
          .where(eq(seasonTeams.id, existingSt.id));
      } else {
        await tx.insert(seasonTeams).values({
          seasonId,
          teamId: args.teamId,
          leagueCategoryId: args.leagueCategoryId,
          metadata: nextMeta,
        });
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") throw e;
    if (e instanceof Error && e.message === "NOT_FOUND") throw e;
    if (e instanceof Error && e.message === "BAD_CATEGORY") throw e;
    if (e instanceof Error && e.message === "DUPLICATE_TEAM_NAME") throw e;
    if (isPostgresUniqueViolation(e)) {
      throw new Error("DUPLICATE_TEAM_NAME");
    }
    throw e;
  }
}
