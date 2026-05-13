import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import {
  leagueCategories,
  leagues,
  seasonTeams,
  seasons,
  teams,
} from "@/db/schema";

import { pickTargetSeasonIdFromCandidates, type SeasonPickRow } from "./season-pick";

export type DbTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type TeamRegistrationContacts = {
  director: {
    fullName: string;
    email: string | null;
    whatsappE164: string;
  };
  additional: {
    fullName: string;
    email: string | null;
    whatsappE164: string;
  };
};

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

export async function ensureTargetSeasonIdForLeagueTx(
  tx: DbTx,
  leagueId: string,
): Promise<string> {
  const rows = await tx
    .select({
      id: seasons.id,
      status: seasons.status,
      startsOn: seasons.startsOn,
    })
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));

  const picked = pickTargetSeasonIdFromCandidates(rows as SeasonPickRow[]);
  if (picked) return picked;

  const slug = `t-${randomBytes(6).toString("hex")}`;
  const [created] = await tx
    .insert(seasons)
    .values({
      leagueId,
      name: "Temporada 1",
      slug,
      status: "scheduled",
      format: "round_robin",
    })
    .returning({ id: seasons.id });

  if (!created) {
    throw new Error("No se pudo crear una temporada para inscribir el equipo.");
  }
  return created.id;
}

/**
 * Crea `teams` + `season_teams` (categoría + contactos en metadata). Solo el dueño de la liga.
 */
export async function createTeamInLeague(args: {
  ownerUserId: string;
  leagueId: string;
  leagueCategoryId: string;
  teamName: string;
  contacts: TeamRegistrationContacts;
}): Promise<{ teamId: string; seasonId: string; seasonTeamId: string }> {
  const db = getDb();
  const teamNameTrim = args.teamName.trim();

  try {
    return await db.transaction(async (tx) => {
      const owner = await tx
        .select({ id: leagues.id })
        .from(leagues)
        .where(and(eq(leagues.id, args.leagueId), eq(leagues.ownerUserId, args.ownerUserId)))
        .limit(1);

      if (!owner[0]) {
        throw new Error("FORBIDDEN");
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

      const seasonId = await ensureTargetSeasonIdForLeagueTx(tx, args.leagueId);

      const [team] = await tx
        .insert(teams)
        .values({
          leagueId: args.leagueId,
          name: teamNameTrim,
          shortName: deriveShortName(teamNameTrim),
          status: "active",
        })
        .returning({ id: teams.id });

      if (!team) {
        throw new Error("No se pudo crear el equipo.");
      }

      const metadata = {
        registrationContacts: args.contacts,
      };

      const [st] = await tx
        .insert(seasonTeams)
        .values({
          seasonId,
          teamId: team.id,
          leagueCategoryId: args.leagueCategoryId,
          metadata,
        })
        .returning({ id: seasonTeams.id });

      if (!st) {
        throw new Error("No se pudo inscribir el equipo en la temporada.");
      }

      return { teamId: team.id, seasonId, seasonTeamId: st.id };
    });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") throw e;
    if (e instanceof Error && e.message === "BAD_CATEGORY") throw e;
    if (isPostgresUniqueViolation(e)) {
      throw new Error("DUPLICATE_TEAM_NAME");
    }
    throw e;
  }
}
