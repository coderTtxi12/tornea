import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  leagueCategories,
  leagues,
  matches,
  seasons,
} from "@/db/schema";

import { listManagedLeagueIdsForDashboardUser } from "./league-dashboard-admin";

const CATEGORY_NONE_LABEL = "Sin categoría";

export type OwnedMatchDashboardFacets = {
  leagueNames: string[];
  seasonNames: string[];
  /** Valores `match_status` tal cual en BD. */
  statuses: string[];
  /** Nombres de categoría + «Sin categoría» si aplica. */
  categoryLabels: string[];
};

/**
 * Valores distintos para filtros de la tabla de partidos (todas las filas gestionadas por el usuario).
 */
export async function listOwnedMatchDashboardFacets(
  ownerUserId: string,
): Promise<OwnedMatchDashboardFacets> {
  const leagueIdsManaged = await listManagedLeagueIdsForDashboardUser(ownerUserId);
  if (leagueIdsManaged.length === 0) {
    return { leagueNames: [], seasonNames: [], statuses: [], categoryLabels: [] };
  }

  const db = getDb();
  const baseWhere = inArray(leagues.id, leagueIdsManaged);

  const [leagueRows, seasonRows, statusRows, categoryRows, uncategorized] = await Promise.all([
    db
      .selectDistinct({ v: leagues.name })
      .from(matches)
      .innerJoin(seasons, eq(matches.seasonId, seasons.id))
      .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
      .where(baseWhere),
    db
      .selectDistinct({ v: seasons.name })
      .from(matches)
      .innerJoin(seasons, eq(matches.seasonId, seasons.id))
      .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
      .where(baseWhere),
    db
      .selectDistinct({ v: matches.status })
      .from(matches)
      .innerJoin(seasons, eq(matches.seasonId, seasons.id))
      .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
      .where(baseWhere),
    db
      .selectDistinct({ v: leagueCategories.name })
      .from(matches)
      .innerJoin(seasons, eq(matches.seasonId, seasons.id))
      .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
      .leftJoin(leagueCategories, eq(matches.leagueCategoryId, leagueCategories.id))
      .where(baseWhere),
    db
      .select({ n: count(matches.id) })
      .from(matches)
      .innerJoin(seasons, eq(matches.seasonId, seasons.id))
      .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
      .where(and(baseWhere, isNull(matches.leagueCategoryId))),
  ]);

  const leagueNames = leagueRows
    .map((r) => r.v)
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, "es"));

  const seasonNames = seasonRows
    .map((r) => r.v)
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, "es"));

  const statuses = statusRows
    .map((r) => String(r.v ?? ""))
    .filter((x) => x.length > 0)
    .sort((a, b) => a.localeCompare(b));

  const categoryLabels = categoryRows
    .map((r) => r.v)
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, "es"));

  const nUncat = Number(uncategorized[0]?.n ?? 0);
  if (nUncat > 0 && !categoryLabels.includes(CATEGORY_NONE_LABEL)) {
    categoryLabels.push(CATEGORY_NONE_LABEL);
    categoryLabels.sort((a, b) => a.localeCompare(b, "es"));
  }

  return { leagueNames, seasonNames, statuses, categoryLabels };
}

export { CATEGORY_NONE_LABEL };
