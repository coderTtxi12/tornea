import { asc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db/client";
import {
  leagueCategories,
  leagueReferees,
  leagues,
  matches,
  seasons,
  teams,
  venues,
} from "@/db/schema";

import { listManagedLeagueIdsForDashboardUser } from "./league-dashboard-admin";
import { readMatchReportMetadata } from "./match-report-metadata";

function pgErrorCode(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let depth = 0; depth < 8 && cur != null; depth++) {
    if (
      typeof cur === "object" &&
      cur !== null &&
      "code" in cur &&
      typeof (cur as { code: unknown }).code === "string"
    ) {
      return (cur as { code: string }).code;
    }
    if (typeof cur === "object" && cur !== null && "cause" in cur) {
      cur = (cur as { cause: unknown }).cause;
    } else {
      break;
    }
  }
  return undefined;
}

export type OwnedMatchDashboardRow = {
  id: string;
  leagueId: string;
  leagueName: string;
  seasonId: string;
  seasonName: string;
  scheduledAt: string;
  timezone: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  venueId: string | null;
  venueName: string | null;
  matchday: number | null;
  roundLabel: string | null;
  leagueCategoryId: string | null;
  categoryName: string | null;
  status: string;
  sportCode: string;
  notes: string | null;
  leagueRefereeId: string | null;
  leagueRefereeFullName: string | null;
  /** `matches.report.playersOnFieldPerTeam` (override por partido). */
  playersOnFieldPerTeam: number | null;
  firstHalfMinutes: number | null;
  halftimeBreakMinutes: number | null;
  secondHalfMinutes: number | null;
};

function iso(d: Date | string): string {
  if (d instanceof Date) return d.toISOString();
  const t = Date.parse(String(d));
  return Number.isNaN(t) ? "" : new Date(t).toISOString();
}

function mapRow(r: {
  id: string;
  scheduledAt: Date | string;
  timezone: string;
  matchday: number | null;
  roundLabel: string | null;
  status: string;
  sportCode: string;
  leagueCategoryId: string | null;
  categoryName: string | null;
  seasonId: string;
  seasonName: string;
  leagueId: string;
  leagueName: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  venueId: string | null;
  venueName: string | null;
  notes: string | null;
  leagueRefereeId: string | null;
  leagueRefereeFullName: string | null;
  report: unknown;
}): OwnedMatchDashboardRow {
  const reportMeta = readMatchReportMetadata(r.report);
  return {
    id: r.id,
    leagueId: r.leagueId,
    leagueName: r.leagueName,
    seasonId: r.seasonId,
    seasonName: r.seasonName,
    scheduledAt: iso(r.scheduledAt),
    timezone: r.timezone,
    homeTeamId: r.homeTeamId,
    homeTeamName: r.homeTeamName,
    awayTeamId: r.awayTeamId,
    awayTeamName: r.awayTeamName,
    venueId: r.venueId,
    venueName: r.venueName ?? null,
    matchday: r.matchday,
    roundLabel: r.roundLabel,
    leagueCategoryId: r.leagueCategoryId,
    categoryName: r.categoryName ?? null,
    status: r.status,
    sportCode: r.sportCode,
    notes: r.notes?.trim() ? r.notes.trim() : null,
    leagueRefereeId: r.leagueRefereeId ?? null,
    leagueRefereeFullName: r.leagueRefereeFullName?.trim() ? r.leagueRefereeFullName.trim() : null,
    playersOnFieldPerTeam: reportMeta.playersOnFieldPerTeam,
    firstHalfMinutes: reportMeta.firstHalfMinutes,
    halftimeBreakMinutes: reportMeta.halftimeBreakMinutes,
    secondHalfMinutes: reportMeta.secondHalfMinutes,
  };
}

/**
 * Todos los partidos en ligas gestionadas.
 * El fixture aplica filtros, orden y paginación en el cliente.
 */
export async function listOwnedMatchDashboardAll(
  ownerUserId: string,
): Promise<OwnedMatchDashboardRow[]> {
  const leagueIdsManaged = await listManagedLeagueIdsForDashboardUser(ownerUserId);
  if (leagueIdsManaged.length === 0) {
    return [];
  }

  const db = getDb();
  const home = alias(teams, "fixture_match_home");
  const away = alias(teams, "fixture_match_away");
  const whereClause = inArray(leagues.id, leagueIdsManaged);

  try {
    const rows = await db
      .select({
        id: matches.id,
        scheduledAt: matches.scheduledAt,
        timezone: matches.timezone,
        matchday: matches.matchday,
        roundLabel: matches.roundLabel,
        status: matches.status,
        sportCode: leagues.sportCode,
        leagueCategoryId: matches.leagueCategoryId,
        categoryName: leagueCategories.name,
        seasonId: seasons.id,
        seasonName: seasons.name,
        leagueId: leagues.id,
        leagueName: leagues.name,
        homeTeamId: home.id,
        homeTeamName: home.name,
        awayTeamId: away.id,
        awayTeamName: away.name,
        venueId: matches.venueId,
        venueName: venues.name,
        notes: matches.notes,
        leagueRefereeId: matches.leagueRefereeId,
        leagueRefereeFullName: leagueReferees.fullName,
        report: matches.report,
      })
      .from(matches)
      .innerJoin(seasons, eq(matches.seasonId, seasons.id))
      .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
      .innerJoin(home, eq(matches.homeTeamId, home.id))
      .innerJoin(away, eq(matches.awayTeamId, away.id))
      .leftJoin(venues, eq(matches.venueId, venues.id))
      .leftJoin(leagueCategories, eq(matches.leagueCategoryId, leagueCategories.id))
      .leftJoin(leagueReferees, eq(matches.leagueRefereeId, leagueReferees.id))
      .where(whereClause)
      .orderBy(asc(matches.scheduledAt), asc(matches.id));

    return rows.map(mapRow);
  } catch (e) {
    /** Migración `0014_matches_league_referee_id` pendiente: misma situación que tabla inexistente. */
    if (pgErrorCode(e) === "42703") {
      console.warn(
        "[listOwnedMatchDashboardAll] Columna matches.league_referee_id inexistente; devolvé fixture sin árbitro hasta `npm run db:migrate` o `npm run db:ensure:matches-league-referee`.",
      );
      const rows = await db
        .select({
          id: matches.id,
          scheduledAt: matches.scheduledAt,
          timezone: matches.timezone,
          matchday: matches.matchday,
          roundLabel: matches.roundLabel,
          status: matches.status,
          sportCode: leagues.sportCode,
          leagueCategoryId: matches.leagueCategoryId,
          categoryName: leagueCategories.name,
          seasonId: seasons.id,
          seasonName: seasons.name,
          leagueId: leagues.id,
          leagueName: leagues.name,
          homeTeamId: home.id,
          homeTeamName: home.name,
          awayTeamId: away.id,
          awayTeamName: away.name,
          venueId: matches.venueId,
          venueName: venues.name,
          notes: matches.notes,
          leagueRefereeId: sql<string | null>`null::uuid`,
          leagueRefereeFullName: sql<string | null>`null::text`,
          report: matches.report,
        })
        .from(matches)
        .innerJoin(seasons, eq(matches.seasonId, seasons.id))
        .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
        .innerJoin(home, eq(matches.homeTeamId, home.id))
        .innerJoin(away, eq(matches.awayTeamId, away.id))
        .leftJoin(venues, eq(matches.venueId, venues.id))
        .leftJoin(leagueCategories, eq(matches.leagueCategoryId, leagueCategories.id))
        .where(whereClause)
        .orderBy(asc(matches.scheduledAt), asc(matches.id));

      return rows.map(mapRow);
    }
    throw e;
  }
}
