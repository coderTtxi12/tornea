import { and, asc, eq, gt, inArray, or, sql } from "drizzle-orm";

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

/** Máximo de filas por petición a BD (paginación servidor). */
export const OWNED_TEAMS_API_PAGE_LIMIT = 50;

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

type TeamCursor = { leagueId: string; name: string; id: string };

export function encodeOwnedTeamsCursor(row: TeamCursor): string {
  return Buffer.from(
    JSON.stringify({ leagueId: row.leagueId, name: row.name, id: row.id }),
    "utf8",
  ).toString("base64url");
}

export function parseOwnedTeamsCursor(raw: string | null | undefined): TeamCursor | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const json = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      leagueId?: string;
      name?: string;
      id?: string;
    };
    if (!json.leagueId || !json.name || !json.id) return null;
    return { leagueId: json.leagueId, name: json.name, id: json.id };
  } catch {
    return null;
  }
}

function stKey(seasonId: string, teamId: string) {
  return `${seasonId}:${teamId}`;
}

async function enrichTeamRows(
  teamRows: Array<{
    id: string;
    leagueId: string;
    name: string;
    shortName: string | null;
    status: string;
    crestUrl: string | null;
  }>,
  leagueNameById: Map<string, string>,
  targetSeasonByLeague: Map<string, string>,
): Promise<OwnedTeamDashboardRow[]> {
  if (teamRows.length === 0) return [];

  const db = getDb();
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

  const rosterAgg = await db
    .select({
      seasonId: teamRosters.seasonId,
      teamId: teamRosters.teamId,
      n: sql<number>`count(*)::int`,
    })
    .from(teamRosters)
    .where(
      and(inArray(teamRosters.seasonId, seasonIds), inArray(teamRosters.teamId, teamIds)),
    )
    .groupBy(teamRosters.seasonId, teamRosters.teamId);

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

/**
 * Equipos de ligas gestionadas, paginados (50 por bloque). Orden: liga, nombre, id.
 */
export async function listOwnedTeamDashboardRowsPage(
  ownerUserId: string,
  options?: { limit?: number; cursor?: string | null },
): Promise<{ rows: OwnedTeamDashboardRow[]; nextCursor: string | null }> {
  const limitCap = Math.min(
    Math.max(options?.limit ?? OWNED_TEAMS_API_PAGE_LIMIT, 1),
    OWNED_TEAMS_API_PAGE_LIMIT,
  );
  const cursorPayload = parseOwnedTeamsCursor(options?.cursor ?? null);

  const db = getDb();

  const leagueIdsManaged = await listManagedLeagueIdsForDashboardUser(ownerUserId);
  if (leagueIdsManaged.length === 0) {
    return { rows: [], nextCursor: null };
  }

  const owned = await db
    .select({ id: leagues.id, name: leagues.name })
    .from(leagues)
    .where(inArray(leagues.id, leagueIdsManaged));

  if (owned.length === 0) {
    return { rows: [], nextCursor: null };
  }

  const leagueIds = owned.map((l) => l.id);
  const leagueNameById = new Map(owned.map((l) => [l.id, l.name]));

  const cursorWhere =
    cursorPayload == null
      ? undefined
      : or(
          gt(teams.leagueId, cursorPayload.leagueId),
          and(
            eq(teams.leagueId, cursorPayload.leagueId),
            or(
              gt(teams.name, cursorPayload.name),
              and(eq(teams.name, cursorPayload.name), gt(teams.id, cursorPayload.id)),
            ),
          ),
        );

  const rawTeams = await db
    .select({
      id: teams.id,
      leagueId: teams.leagueId,
      name: teams.name,
      shortName: teams.shortName,
      status: teams.status,
      crestUrl: teams.crestUrl,
    })
    .from(teams)
    .where(and(inArray(teams.leagueId, leagueIds), cursorWhere))
    .orderBy(asc(teams.leagueId), asc(teams.name), asc(teams.id))
    .limit(limitCap + 1);

  const hasMore = rawTeams.length > limitCap;
  const pageTeams = hasMore ? rawTeams.slice(0, limitCap) : rawTeams;

  if (pageTeams.length === 0) {
    return { rows: [], nextCursor: null };
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

  const rows = await enrichTeamRows(pageTeams, leagueNameById, targetSeasonByLeague);

  const last = pageTeams[pageTeams.length - 1];
  const nextCursor =
    hasMore && last != null
      ? encodeOwnedTeamsCursor({
          leagueId: last.leagueId,
          name: last.name,
          id: last.id,
        })
      : null;

  return { rows, nextCursor };
}

/** Primera página (compatibilidad). */
export async function listOwnedTeamDashboardRows(
  ownerUserId: string,
): Promise<OwnedTeamDashboardRow[]> {
  const page = await listOwnedTeamDashboardRowsPage(ownerUserId);
  return page.rows;
}
