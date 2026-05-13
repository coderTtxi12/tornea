import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { seasonTeams, seasons, teams } from "@/db/schema";

import { userCanManageLeague } from "./league-dashboard-admin";

export type SeasonTeamScheduleRow = {
  id: string;
  name: string;
  shortName: string | null;
  leagueCategoryId: string | null;
};

/**
 * Equipos con fila `season_teams` en la temporada (para armar el fixture).
 */
export async function listSeasonTeamsForScheduling(args: {
  actorUserId: string;
  leagueId: string;
  seasonId: string;
}): Promise<
  { ok: true; teams: SeasonTeamScheduleRow[] } | { ok: false; reason: "forbidden" | "not_found" }
> {
  const db = getDb();
  const can = await userCanManageLeague(db, args.leagueId, args.actorUserId);
  if (!can) {
    return { ok: false, reason: "forbidden" };
  }

  const [season] = await db
    .select({ id: seasons.id, leagueId: seasons.leagueId })
    .from(seasons)
    .where(eq(seasons.id, args.seasonId))
    .limit(1);
  if (!season || season.leagueId !== args.leagueId) {
    return { ok: false, reason: "not_found" };
  }

  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      shortName: teams.shortName,
      leagueCategoryId: seasonTeams.leagueCategoryId,
    })
    .from(seasonTeams)
    .innerJoin(teams, eq(seasonTeams.teamId, teams.id))
    .where(and(eq(seasonTeams.seasonId, args.seasonId), eq(teams.leagueId, args.leagueId)))
    .orderBy(asc(teams.name));

  return {
    ok: true,
    teams: rows.map((r) => ({
      id: r.id,
      name: r.name,
      shortName: r.shortName,
      leagueCategoryId: r.leagueCategoryId,
    })),
  };
}
