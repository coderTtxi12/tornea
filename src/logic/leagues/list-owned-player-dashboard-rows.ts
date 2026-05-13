import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagues, players, seasons, teamRosters, teams } from "@/db/schema";

import { resolvePlayerPhotoForImgDisplay } from "@/logic/leagues/resolve-supabase-storage-url-for-img-display";

import { pickTargetSeasonIdFromCandidates, type SeasonPickRow } from "./season-pick";

export type OwnedPlayerDashboardRow = {
  /** `team_rosters.id` (fila única en la tabla). */
  id: string;
  playerId: string;
  leagueId: string;
  leagueName: string;
  teamId: string;
  teamName: string;
  teamShort: string | null;
  fullName: string;
  shirtNumber: number | null;
  position: string | null;
  /** URL lista para `<img>` (firmada si el bucket de Storage es privado). */
  profileImageUrl: string | null;
};

/**
 * Jugadores en plantilla (`team_rosters`) de equipos de ligas propias,
 * limitado a la temporada objetivo por liga (misma heurística que equipos / tarjetas).
 */
export async function listOwnedPlayerDashboardRows(
  ownerUserId: string,
): Promise<OwnedPlayerDashboardRow[]> {
  const db = getDb();

  const owned = await db
    .select({ id: leagues.id, name: leagues.name })
    .from(leagues)
    .where(eq(leagues.ownerUserId, ownerUserId));

  if (owned.length === 0) {
    return [];
  }

  const leagueIds = owned.map((l) => l.id);

  const teamRows = await db
    .select({
      id: teams.id,
      leagueId: teams.leagueId,
    })
    .from(teams)
    .where(inArray(teams.leagueId, leagueIds));

  if (teamRows.length === 0) {
    return [];
  }

  const teamIds = teamRows.map((t) => t.id);

  const seasonRows = await db
    .select({
      leagueId: seasons.leagueId,
      id: seasons.id,
      status: seasons.status,
      startsOn: seasons.startsOn,
    })
    .from(seasons)
    .where(inArray(seasons.leagueId, leagueIds));

  const seasonsByLeague = new Map<string, SeasonPickRow[]>();
  for (const s of seasonRows) {
    const list = seasonsByLeague.get(s.leagueId) ?? [];
    list.push({
      id: s.id,
      status: s.status,
      startsOn: s.startsOn,
    });
    seasonsByLeague.set(s.leagueId, list);
  }

  const seasonIds = [
    ...new Set(
      leagueIds
        .map((lid) => pickTargetSeasonIdFromCandidates(seasonsByLeague.get(lid) ?? []))
        .filter((id): id is string => id != null),
    ),
  ];
  if (seasonIds.length === 0) {
    return [];
  }

  const rosterRows = await db
    .select({
      id: teamRosters.id,
      shirtNumber: teamRosters.shirtNumber,
      position: teamRosters.position,
      playerId: players.id,
      fullName: players.fullName,
      metadata: players.metadata,
      teamId: teams.id,
      teamName: teams.name,
      teamShort: teams.shortName,
      leagueId: leagues.id,
      leagueName: leagues.name,
    })
    .from(teamRosters)
    .innerJoin(players, eq(teamRosters.playerId, players.id))
    .innerJoin(teams, eq(teamRosters.teamId, teams.id))
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .innerJoin(seasons, eq(teamRosters.seasonId, seasons.id))
    .where(
      and(
        eq(leagues.ownerUserId, ownerUserId),
        eq(players.leagueId, teams.leagueId),
        eq(seasons.leagueId, teams.leagueId),
        inArray(teamRosters.seasonId, seasonIds),
        inArray(teamRosters.teamId, teamIds),
      ),
    )
    .orderBy(
      asc(leagues.name),
      asc(teams.name),
      asc(players.fullName),
      asc(teamRosters.shirtNumber),
    );

  return Promise.all(
    rosterRows.map(async (r) => ({
      id: r.id,
      playerId: r.playerId,
      leagueId: r.leagueId,
      leagueName: r.leagueName,
      teamId: r.teamId,
      teamName: r.teamName,
      teamShort: r.teamShort,
      fullName: r.fullName,
      shirtNumber: r.shirtNumber,
      position: r.position,
      profileImageUrl: await resolvePlayerPhotoForImgDisplay(r.metadata),
    })),
  );
}
