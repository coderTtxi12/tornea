import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagues, players, seasons, teamRosters, teams } from "@/db/schema";

import { resolvePlayerPhotoForImgDisplay } from "@/logic/leagues/resolve-supabase-storage-url-for-img-display";

import { userCanManageLeague } from "./league-dashboard-admin";
import type { OwnedPlayerDashboardRow } from "./list-owned-player-dashboard-rows";
import { pickTargetSeasonIdFromCandidates, type SeasonPickRow } from "./season-pick";

/**
 * Plantilla del equipo en la temporada objetivo de su liga (`team_rosters` + `players`).
 */
export async function listTeamRosterDashboardRows(
  ownerUserId: string,
  leagueId: string,
  teamId: string,
): Promise<OwnedPlayerDashboardRow[] | "FORBIDDEN" | "NOT_FOUND"> {
  const db = getDb();

  if (!(await userCanManageLeague(db, leagueId, ownerUserId))) {
    return "FORBIDDEN";
  }

  const [team] = await db
    .select({ id: teams.id, leagueId: teams.leagueId, name: teams.name, shortName: teams.shortName })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.leagueId, leagueId)))
    .limit(1);

  if (!team) {
    return "NOT_FOUND";
  }

  const [league] = await db
    .select({ id: leagues.id, name: leagues.name })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (!league) {
    return "NOT_FOUND";
  }

  const seasonRows = await db
    .select({
      id: seasons.id,
      status: seasons.status,
      startsOn: seasons.startsOn,
    })
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));

  const seasonCandidates: SeasonPickRow[] = seasonRows.map((s) => ({
    id: s.id,
    status: s.status,
    startsOn: s.startsOn,
  }));
  const targetSeasonId = pickTargetSeasonIdFromCandidates(seasonCandidates);
  if (!targetSeasonId) {
    return [];
  }

  const rosterRows = await db
    .select({
      id: teamRosters.id,
      shirtNumber: teamRosters.shirtNumber,
      position: teamRosters.position,
      registeredAt: teamRosters.registeredAt,
      playerId: players.id,
      fullName: players.fullName,
      metadata: players.metadata,
    })
    .from(teamRosters)
    .innerJoin(players, eq(teamRosters.playerId, players.id))
    .where(
      and(
        eq(teamRosters.seasonId, targetSeasonId),
        eq(teamRosters.teamId, teamId),
        eq(players.leagueId, leagueId),
      ),
    )
    .orderBy(asc(players.fullName), asc(teamRosters.id));

  const rows = await Promise.all(
    rosterRows.map(async (r) => ({
      id: r.id,
      playerId: r.playerId,
      leagueId,
      leagueName: league.name,
      teamId: team.id,
      teamName: team.name,
      teamShort: team.shortName,
      fullName: r.fullName,
      shirtNumber: r.shirtNumber,
      position: r.position,
      registeredAt: r.registeredAt.toISOString(),
      profileImageUrl: await resolvePlayerPhotoForImgDisplay(r.metadata),
    })),
  );

  return rows;
}
