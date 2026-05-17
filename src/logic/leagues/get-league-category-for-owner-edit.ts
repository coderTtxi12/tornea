import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagueCategories, leagues } from "@/db/schema";

import { userCanManageLeague } from "./league-dashboard-admin";
import { readLeagueCategoryMetadata } from "./league-category-metadata";
import type { LeagueCategoryGenderDb } from "./create-league-category-with-idempotency";

export type LeagueCategoryEditPayload = {
  category: {
    id: string;
    leagueId: string;
    code: string;
    name: string;
    gender: LeagueCategoryGenderDb;
    birthYearMin: number | null;
    birthYearMax: number | null;
    minTeamsToStart: number | null;
  };
};

export async function getLeagueCategoryForOwnerEdit(
  ownerUserId: string,
  leagueId: string,
  categoryId: string,
): Promise<LeagueCategoryEditPayload | "FORBIDDEN" | "NOT_FOUND"> {
  const db = getDb();

  const [leagueRow] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!leagueRow) {
    return "NOT_FOUND";
  }
  if (!(await userCanManageLeague(db, leagueId, ownerUserId))) {
    return "FORBIDDEN";
  }

  const [row] = await db
    .select({
      id: leagueCategories.id,
      leagueId: leagueCategories.leagueId,
      code: leagueCategories.code,
      name: leagueCategories.name,
      gender: leagueCategories.gender,
      metadata: leagueCategories.metadata,
    })
    .from(leagueCategories)
    .where(and(eq(leagueCategories.id, categoryId), eq(leagueCategories.leagueId, leagueId)))
    .limit(1);

  if (!row) {
    return "NOT_FOUND";
  }

  const meta = readLeagueCategoryMetadata(row.metadata);

  return {
    category: {
      id: row.id,
      leagueId: row.leagueId,
      code: row.code,
      name: row.name,
      gender: row.gender as LeagueCategoryGenderDb,
      birthYearMin: meta.birthYearMin,
      birthYearMax: meta.birthYearMax,
      minTeamsToStart: meta.minTeamsToStart,
    },
  };
}
