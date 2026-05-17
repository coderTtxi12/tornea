import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagueCategories } from "@/db/schema";

import type { NewLeagueCategoryBody } from "./create-league-category-with-idempotency";
import { getLeagueCategoryForOwnerEdit } from "./get-league-category-for-owner-edit";
import { mergeLeagueCategoryMetadata } from "./league-category-metadata";

export type UpdateLeagueCategoryForOwnerArgs = {
  ownerUserId: string;
  leagueId: string;
  categoryId: string;
  fields: NewLeagueCategoryBody;
};

export type UpdatedLeagueCategorySummary = {
  id: string;
  code: string;
  name: string;
  gender: NewLeagueCategoryBody["gender"];
};

/**
 * Actualiza solo datos que no rompen FKs: `name`, `gender`, `metadata` (años de nacimiento, equipos mín.).
 * No modifica `code`, `league_id`, `sort_order`, `age_min` / `age_max` ni el `id`.
 */
export async function updateLeagueCategoryForOwner(
  args: UpdateLeagueCategoryForOwnerArgs,
): Promise<UpdatedLeagueCategorySummary | "FORBIDDEN" | "NOT_FOUND"> {
  const current = await getLeagueCategoryForOwnerEdit(
    args.ownerUserId,
    args.leagueId,
    args.categoryId,
  );
  if (current === "FORBIDDEN" || current === "NOT_FOUND") {
    return current;
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const [prow] = await tx
      .select({ metadata: leagueCategories.metadata })
      .from(leagueCategories)
      .where(
        and(
          eq(leagueCategories.id, args.categoryId),
          eq(leagueCategories.leagueId, args.leagueId),
        ),
      )
      .limit(1);
    if (!prow) {
      return "NOT_FOUND" as const;
    }

    const nextMetadata = mergeLeagueCategoryMetadata(prow.metadata, {
      birthYearMin: args.fields.birthYearMin,
      birthYearMax: args.fields.birthYearMax,
      minTeamsToStart: args.fields.minTeamsToStart,
    });

    const [updated] = await tx
      .update(leagueCategories)
      .set({
        name: args.fields.name.trim(),
        gender: args.fields.gender,
        metadata: nextMetadata,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leagueCategories.id, args.categoryId),
          eq(leagueCategories.leagueId, args.leagueId),
        ),
      )
      .returning({
        id: leagueCategories.id,
        code: leagueCategories.code,
        name: leagueCategories.name,
        gender: leagueCategories.gender,
      });

    if (!updated) {
      return "NOT_FOUND" as const;
    }

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      gender: updated.gender as NewLeagueCategoryBody["gender"],
    };
  });
}
