import { and, asc, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  leagueCategories,
  leagues,
  seasonTeams,
  seasons,
  teamRosters,
  teams,
} from "@/db/schema";

import { listManagedLeagueIdsForDashboardUser } from "./league-dashboard-admin";
import { pickTargetSeasonIdFromCandidates, type SeasonPickRow } from "./season-pick";

export type OwnedTeamDashboardRow = {
  id: string;
  leagueId: string;
  leagueName: string;
  name: string;
  shortName: string | null;
  playersCount: number;
  status: "active" | "inactive" | "withdrawn";
  categoryName: string | null;
  crestUrl: string | null;
};

/**
 * Equipos de ligas que el usuario gestiona (dueño o admin), con categoría y plantilla
 * referidas a la temporada objetivo por liga (misma heurística que las tarjetas de liga).
 */
export async function listOwnedTeamDashboardRows(
  ownerUserId: string,
): Promise<OwnedTeamDashboardRow[]> {
  const db = getDb();

  const leagueIdsManaged = await listManagedLeagueIdsForDashboardUser(ownerUserId);
  if (leagueIdsManaged.length === 0) {
    return [];
  }

  const owned = await db
    .select({ id: leagues.id, name: leagues.name })
    .from(leagues)
    .where(inArray(leagues.id, leagueIdsManaged));

  if (owned.length === 0) {
    return [];
  }

  const leagueIds = owned.map((l) => l.id);
  const leagueNameById = new Map(owned.map((l) => [l.id, l.name]));

  const teamRows = await db
    .select({
      id: teams.id,
      leagueId: teams.leagueId,
      name: teams.name,
      shortName: teams.shortName,
      status: teams.status,
      crestUrl: teams.crestUrl,
    })
    .from(teams)
    .where(inArray(teams.leagueId, leagueIds))
    .orderBy(asc(teams.leagueId), asc(teams.name));

  if (teamRows.length === 0) {
    return [];
  }

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

  const targetSeasonByLeague = new Map<string, string>();
  for (const lid of leagueIds) {
    const picked = pickTargetSeasonIdFromCandidates(seasonsByLeague.get(lid) ?? []);
    if (picked) targetSeasonByLeague.set(lid, picked);
  }

  const seasonIds = [...new Set(targetSeasonByLeague.values())];
  const teamIds = teamRows.map((t) => t.id);

  if (seasonIds.length === 0) {
    return teamRows.map((t) => ({
      id: t.id,
      leagueId: t.leagueId,
      leagueName: leagueNameById.get(t.leagueId) ?? "",
      name: t.name,
      shortName: t.shortName,
      playersCount: 0,
      status: t.status as OwnedTeamDashboardRow["status"],
      categoryName: null,
      crestUrl: t.crestUrl,
    }));
  }

  const stRows = await db
    .select({
      seasonId: seasonTeams.seasonId,
      teamId: seasonTeams.teamId,
      leagueCategoryId: seasonTeams.leagueCategoryId,
    })
    .from(seasonTeams)
    .where(
      and(inArray(seasonTeams.seasonId, seasonIds), inArray(seasonTeams.teamId, teamIds)),
    );

  const stKey = (seasonId: string, teamId: string) => `${seasonId}:${teamId}`;
  const enrollmentByKey = new Map<string, { leagueCategoryId: string | null }>();
  for (const r of stRows) {
    enrollmentByKey.set(stKey(r.seasonId, r.teamId), {
      leagueCategoryId: r.leagueCategoryId,
    });
  }

  const categoryIds = [
    ...new Set(
      stRows.map((r) => r.leagueCategoryId).filter((id): id is string => id != null),
    ),
  ];

  const categoryNameById = new Map<string, string>();
  if (categoryIds.length > 0) {
    const cats = await db
      .select({ id: leagueCategories.id, name: leagueCategories.name })
      .from(leagueCategories)
      .where(inArray(leagueCategories.id, categoryIds));
    for (const c of cats) {
      categoryNameById.set(c.id, c.name);
    }
  }

  const rosterAgg =
    seasonIds.length > 0 && teamIds.length > 0
      ? await db
          .select({
            seasonId: teamRosters.seasonId,
            teamId: teamRosters.teamId,
            n: sql<number>`count(*)::int`,
          })
          .from(teamRosters)
          .where(
            and(inArray(teamRosters.seasonId, seasonIds), inArray(teamRosters.teamId, teamIds)),
          )
          .groupBy(teamRosters.seasonId, teamRosters.teamId)
      : [];

  const rosterByKey = new Map<string, number>();
  for (const r of rosterAgg) {
    rosterByKey.set(stKey(r.seasonId, r.teamId), Number(r.n));
  }

  return teamRows.map((t) => {
    const seasonId = targetSeasonByLeague.get(t.leagueId);
    let categoryName: string | null = null;
    let playersCount = 0;
    if (seasonId) {
      const en = enrollmentByKey.get(stKey(seasonId, t.id));
      if (en?.leagueCategoryId) {
        categoryName = categoryNameById.get(en.leagueCategoryId) ?? null;
      }
      playersCount = rosterByKey.get(stKey(seasonId, t.id)) ?? 0;
    }

    return {
      id: t.id,
      leagueId: t.leagueId,
      leagueName: leagueNameById.get(t.leagueId) ?? "",
      name: t.name,
      shortName: t.shortName,
      playersCount,
      status: t.status as OwnedTeamDashboardRow["status"],
      categoryName,
      crestUrl: t.crestUrl,
    };
  });
}
