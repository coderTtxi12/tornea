import { and, desc, eq, inArray, lt, or } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagues, players, seasons, teamRosters, teams } from "@/db/schema";

import { resolvePlayerPhotoForImgDisplay } from "@/logic/leagues/resolve-supabase-storage-url-for-img-display";

import { pickTargetSeasonIdFromCandidates, type SeasonPickRow } from "./season-pick";

/** Máximo de filas por petición a BD (paginación servidor). */
export const OWNED_PLAYERS_API_PAGE_LIMIT = 50;

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
  /** ISO — `team_rosters.registered_at` (cuándo entró a la plantilla). */
  registeredAt: string;
  /** URL lista para `<img>` (firmada si el bucket de Storage es privado). */
  profileImageUrl: string | null;
};

type RosterCursor = { registeredAt: Date; id: string };

export function encodeOwnedPlayersCursor(row: {
  registeredAt: Date;
  id: string;
}): string {
  return Buffer.from(
    JSON.stringify({ t: row.registeredAt.toISOString(), id: row.id }),
    "utf8",
  ).toString("base64url");
}

export function parseOwnedPlayersCursor(raw: string | null | undefined): RosterCursor | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const json = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      t?: string;
      id?: string;
    };
    if (!json.t || !json.id) return null;
    const registeredAt = new Date(json.t);
    if (Number.isNaN(registeredAt.getTime())) return null;
    return { registeredAt, id: json.id };
  } catch {
    return null;
  }
}

/**
 * Jugadores en plantilla (`team_rosters`) de equipos de ligas propias,
 * limitado a la temporada objetivo por liga. Orden: alta en plantilla más reciente primero.
 * Paginación por cursor (clave compuesta registered_at + id).
 */
export async function listOwnedPlayerDashboardRowsPage(
  ownerUserId: string,
  options?: { limit?: number; cursor?: string | null },
): Promise<{
  rows: OwnedPlayerDashboardRow[];
  nextCursor: string | null;
}> {
  const limitCap = Math.min(
    Math.max(options?.limit ?? OWNED_PLAYERS_API_PAGE_LIMIT, 1),
    OWNED_PLAYERS_API_PAGE_LIMIT,
  );
  const cursorPayload = parseOwnedPlayersCursor(options?.cursor ?? null);

  const db = getDb();

  const owned = await db
    .select({ id: leagues.id, name: leagues.name })
    .from(leagues)
    .where(eq(leagues.ownerUserId, ownerUserId));

  if (owned.length === 0) {
    return { rows: [], nextCursor: null };
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
    return { rows: [], nextCursor: null };
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
    return { rows: [], nextCursor: null };
  }

  const cursorWhere =
    cursorPayload == null
      ? undefined
      : or(
          lt(teamRosters.registeredAt, cursorPayload.registeredAt),
          and(
            eq(teamRosters.registeredAt, cursorPayload.registeredAt),
            lt(teamRosters.id, cursorPayload.id),
          ),
        );

  const rosterRows = await db
    .select({
      id: teamRosters.id,
      shirtNumber: teamRosters.shirtNumber,
      position: teamRosters.position,
      registeredAt: teamRosters.registeredAt,
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
        cursorWhere,
      ),
    )
    .orderBy(desc(teamRosters.registeredAt), desc(teamRosters.id))
    .limit(limitCap + 1);

  const hasMore = rosterRows.length > limitCap;
  const pageRows = hasMore ? rosterRows.slice(0, limitCap) : rosterRows;

  const rows = await Promise.all(
    pageRows.map(async (r) => ({
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
      registeredAt: r.registeredAt.toISOString(),
      profileImageUrl: await resolvePlayerPhotoForImgDisplay(r.metadata),
    })),
  );

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last != null
      ? encodeOwnedPlayersCursor({ registeredAt: last.registeredAt, id: last.id })
      : null;

  return { rows, nextCursor };
}
