import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  or,
  type InferSelectModel,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db/client";
import {
  leagueCategories,
  leagues,
  matches,
  seasons,
  teams,
  venues,
} from "@/db/schema";

import { listManagedLeagueIdsForDashboardUser } from "./league-dashboard-admin";

const CATEGORY_NONE_LABEL = "Sin categoría";

type MatchRowStatus = InferSelectModel<typeof matches>["status"];

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
};

export type OwnedMatchDashboardListFilters = {
  leagueNames: string[];
  seasonNames: string[];
  /** Códigos `match_status`. */
  statuses: string[];
  /** Etiquetas de categoría; incluye «Sin categoría» para `league_category_id` nulo. */
  categoryNames: string[];
};

export type OwnedMatchDashboardListSort = {
  key: "kickoff" | "matchup";
  dir: "asc" | "desc";
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
}): OwnedMatchDashboardRow {
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
  };
}

function buildWhereParts(
  leagueIdsManaged: string[],
  filters: OwnedMatchDashboardListFilters,
): SQL[] {
  const parts: SQL[] = [inArray(leagues.id, leagueIdsManaged)];

  if (filters.leagueNames.length > 0) {
    parts.push(inArray(leagues.name, filters.leagueNames));
  }
  if (filters.seasonNames.length > 0) {
    parts.push(inArray(seasons.name, filters.seasonNames));
  }
  if (filters.statuses.length > 0) {
    parts.push(inArray(matches.status, filters.statuses as MatchRowStatus[]));
  }
  if (filters.categoryNames.length > 0) {
    const hasNone = filters.categoryNames.includes(CATEGORY_NONE_LABEL);
    const namedOnly = filters.categoryNames.filter((c) => c !== CATEGORY_NONE_LABEL);
    const catPreds: SQL[] = [];
    if (namedOnly.length > 0) {
      catPreds.push(inArray(leagueCategories.name, namedOnly));
    }
    if (hasNone) {
      catPreds.push(isNull(matches.leagueCategoryId));
    }
    if (catPreds.length === 1) {
      parts.push(catPreds[0]!);
    } else if (catPreds.length === 2) {
      parts.push(or(catPreds[0], catPreds[1])!);
    }
  }

  return parts;
}

/**
 * Partidos paginados con filtros y orden en SQL (`matches` en ligas gestionadas).
 */
export async function listOwnedMatchDashboardPage(
  ownerUserId: string,
  opts: {
    page: number;
    pageSize: number;
    sort: OwnedMatchDashboardListSort;
    filters: OwnedMatchDashboardListFilters;
  },
): Promise<{ rows: OwnedMatchDashboardRow[]; total: number }> {
  const leagueIdsManaged = await listManagedLeagueIdsForDashboardUser(ownerUserId);
  if (leagueIdsManaged.length === 0) {
    return { rows: [], total: 0 };
  }

  const page = Math.max(1, opts.page);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize));
  const offset = (page - 1) * pageSize;

  const db = getDb();
  const home = alias(teams, "fixture_match_home");
  const away = alias(teams, "fixture_match_away");

  const whereClause = and(...buildWhereParts(leagueIdsManaged, opts.filters));

  const baseFrom = db
    .select({ n: count(matches.id) })
    .from(matches)
    .innerJoin(seasons, eq(matches.seasonId, seasons.id))
    .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
    .innerJoin(home, eq(matches.homeTeamId, home.id))
    .innerJoin(away, eq(matches.awayTeamId, away.id))
    .leftJoin(venues, eq(matches.venueId, venues.id))
    .leftJoin(leagueCategories, eq(matches.leagueCategoryId, leagueCategories.id))
    .where(whereClause);

  const [countRow] = await baseFrom;
  const total = Number(countRow?.n ?? 0);

  const orderByClause =
    opts.sort.key === "kickoff"
      ? opts.sort.dir === "asc"
        ? [asc(matches.scheduledAt), asc(matches.id)]
        : [desc(matches.scheduledAt), asc(matches.id)]
      : opts.sort.dir === "asc"
        ? [asc(home.name), asc(away.name), asc(matches.id)]
        : [desc(home.name), desc(away.name), asc(matches.id)];

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
    })
    .from(matches)
    .innerJoin(seasons, eq(matches.seasonId, seasons.id))
    .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
    .innerJoin(home, eq(matches.homeTeamId, home.id))
    .innerJoin(away, eq(matches.awayTeamId, away.id))
    .leftJoin(venues, eq(matches.venueId, venues.id))
    .leftJoin(leagueCategories, eq(matches.leagueCategoryId, leagueCategories.id))
    .where(whereClause)
    .orderBy(...orderByClause)
    .limit(pageSize)
    .offset(offset);

  return { rows: rows.map(mapRow), total };
}
