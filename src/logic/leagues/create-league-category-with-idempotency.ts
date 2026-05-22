import { createHash } from "node:crypto";
import { randomBytes } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import type { Db } from "@/db/client";
import { userCanManageLeague } from "@/logic/leagues/league-dashboard-admin";
import {
  leagueCategories,
  leagueCategoryCreateIdempotency,
} from "@/db/schema";

export type LeagueCategoryGenderDb = "male" | "female" | "mixed" | "unspecified";

export type NewLeagueCategoryBody = {
  name: string;
  gender: LeagueCategoryGenderDb;
  /** `metadata.birthYearMin` — año más antiguo permitido (límite inferior). */
  birthYearMin: number | null;
  /** `metadata.birthYearMax` — año más reciente permitido (límite superior). */
  birthYearMax: number | null;
  minTeamsToStart: number | null;
  playersOnFieldPerTeam: number | null;
  firstHalfMinutes: number;
  halftimeBreakMinutes: number;
  secondHalfMinutes: number;
};

export type CreatedLeagueCategoryRow = {
  id: string;
  leagueId: string;
  code: string;
  name: string;
  gender: LeagueCategoryGenderDb;
  ageMin: number | null;
  ageMax: number | null;
  sortOrder: number;
};

type DbTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function advisoryLockKeyPair(scope: string): [number, number] {
  const buf = createHash("sha256").update(scope, "utf8").digest();
  return [buf.readInt32BE(0), buf.readInt32BE(4)];
}

function slugBaseFromCategoryName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "categoria";
  return base;
}

async function pickUniqueCategoryCode(
  tx: DbTx,
  leagueId: string,
  displayName: string,
): Promise<string> {
  const base = slugBaseFromCategoryName(displayName);
  for (let attempt = 0; attempt < 16; attempt++) {
    const suffix = attempt === 0 ? "" : `-${randomBytes(3).toString("hex")}`;
    const code = `${base}${suffix}`.slice(0, 96);
    const dup = await tx
      .select({ id: leagueCategories.id })
      .from(leagueCategories)
      .where(
        and(
          eq(leagueCategories.leagueId, leagueId),
          sql`lower(${leagueCategories.code}) = lower(${code})`,
        ),
      )
      .limit(1);
    if (!dup[0]) return code;
  }
  throw new Error("No se pudo asignar un código único para la categoría");
}

/**
 * Crea una fila en `league_categories` con idempotencia por usuario + clave HTTP.
 * Dueño de la liga o administrador del panel.
 */
export async function createLeagueCategoryWithIdempotency(
  appUserId: string,
  leagueId: string,
  idempotencyKey: string,
  fields: NewLeagueCategoryBody,
): Promise<{ replay: boolean; category: CreatedLeagueCategoryRow }> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [k1, k2] = advisoryLockKeyPair(
      `league_category_create:${appUserId}:${idempotencyKey}`,
    );
    await tx.execute(sql`select pg_advisory_xact_lock(${k1}::int, ${k2}::int)`);

    const existing = await tx
      .select({ categoryId: leagueCategoryCreateIdempotency.leagueCategoryId })
      .from(leagueCategoryCreateIdempotency)
      .where(
        and(
          eq(leagueCategoryCreateIdempotency.userId, appUserId),
          eq(leagueCategoryCreateIdempotency.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    if (existing[0]) {
      const row = await tx
        .select({
          id: leagueCategories.id,
          leagueId: leagueCategories.leagueId,
          code: leagueCategories.code,
          name: leagueCategories.name,
          gender: leagueCategories.gender,
          ageMin: leagueCategories.ageMin,
          ageMax: leagueCategories.ageMax,
          sortOrder: leagueCategories.sortOrder,
        })
        .from(leagueCategories)
        .where(eq(leagueCategories.id, existing[0].categoryId))
        .limit(1);

      if (!row[0]) {
        throw new Error("Inconsistencia: idempotencia sin categoría asociada");
      }
      if (row[0].leagueId !== leagueId) {
        throw new Error("Inconsistencia: idempotencia apunta a otra liga");
      }

      return { replay: true, category: row[0] };
    }

    if (!(await userCanManageLeague(tx, leagueId, appUserId))) {
      throw new Error("FORBIDDEN");
    }

    const [agg] = await tx
      .select({
        maxSort: sql<string>`coalesce(max(${leagueCategories.sortOrder}), -1)`,
      })
      .from(leagueCategories)
      .where(eq(leagueCategories.leagueId, leagueId));

    const nextSort = Number(agg?.maxSort ?? -1) + 1;
    const code = await pickUniqueCategoryCode(tx, leagueId, fields.name);

    const metadata: Record<string, unknown> = {};
    if (fields.birthYearMin != null) {
      metadata.birthYearMin = fields.birthYearMin;
    }
    if (fields.birthYearMax != null) {
      metadata.birthYearMax = fields.birthYearMax;
    }
    if (fields.minTeamsToStart != null) {
      metadata.minTeamsToStart = fields.minTeamsToStart;
    }
    if (fields.playersOnFieldPerTeam != null) {
      metadata.playersOnFieldPerTeam = fields.playersOnFieldPerTeam;
    }
    metadata.firstHalfMinutes = fields.firstHalfMinutes;
    metadata.halftimeBreakMinutes = fields.halftimeBreakMinutes;
    metadata.secondHalfMinutes = fields.secondHalfMinutes;

    const [created] = await tx
      .insert(leagueCategories)
      .values({
        leagueId,
        code,
        name: fields.name.trim(),
        gender: fields.gender,
        ageMin: null,
        ageMax: null,
        sortOrder: nextSort,
        metadata: Object.keys(metadata).length > 0 ? metadata : {},
      })
      .returning({
        id: leagueCategories.id,
        leagueId: leagueCategories.leagueId,
        code: leagueCategories.code,
        name: leagueCategories.name,
        gender: leagueCategories.gender,
        ageMin: leagueCategories.ageMin,
        ageMax: leagueCategories.ageMax,
        sortOrder: leagueCategories.sortOrder,
      });

    if (!created) {
      throw new Error("No se pudo crear la categoría");
    }

    await tx.insert(leagueCategoryCreateIdempotency).values({
      userId: appUserId,
      idempotencyKey,
      leagueCategoryId: created.id,
    });

    return { replay: false, category: created };
  });
}
