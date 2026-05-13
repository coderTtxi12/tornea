import { eq, max } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagueReferees, leagues } from "@/db/schema";

import { userCanManageLeague } from "./league-dashboard-admin";

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

export type CreateLeagueRefereeInput = {
  actorUserId: string;
  leagueId: string;
  fullName: string;
  whatsappE164: string;
  email: string | null;
  notes: string | null;
};

export type CreateLeagueRefereeResult =
  | { ok: true; refereeId: string; leagueOwnerUserId: string }
  | {
      ok: false;
      reason: "forbidden" | "league_not_found" | "schema_not_ready";
    };

/**
 * Alta de árbitro de contacto (`league_referees`) para una liga gestionada.
 */
export async function createLeagueReferee(
  input: CreateLeagueRefereeInput,
): Promise<CreateLeagueRefereeResult> {
  const db = getDb();

  const allowed = await userCanManageLeague(db, input.leagueId, input.actorUserId);
  if (!allowed) {
    return { ok: false, reason: "forbidden" };
  }

  const [league] = await db
    .select({ id: leagues.id, ownerUserId: leagues.ownerUserId })
    .from(leagues)
    .where(eq(leagues.id, input.leagueId))
    .limit(1);
  if (!league) {
    return { ok: false, reason: "league_not_found" };
  }

  try {
    const [agg] = await db
      .select({ m: max(leagueReferees.sortOrder) })
      .from(leagueReferees)
      .where(eq(leagueReferees.leagueId, input.leagueId));
    const nextOrder = (agg?.m != null ? Number(agg.m) : -1) + 1;

    const [created] = await db
      .insert(leagueReferees)
      .values({
        leagueId: input.leagueId,
        fullName: input.fullName,
        whatsapp: input.whatsappE164,
        email: input.email,
        curp: null,
        notes: input.notes,
        sortOrder: nextOrder,
        metadata: {},
      })
      .returning({ id: leagueReferees.id });

    if (!created) {
      return { ok: false, reason: "league_not_found" };
    }

    return {
      ok: true,
      refereeId: created.id,
      leagueOwnerUserId: league.ownerUserId,
    };
  } catch (e) {
    if (pgErrorCode(e) === "42P01") {
      return { ok: false, reason: "schema_not_ready" };
    }
    throw e;
  }
}

export async function mergeLeagueRefereeMetadata(
  refereeId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  const db = getDb();
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ metadata: leagueReferees.metadata })
      .from(leagueReferees)
      .where(eq(leagueReferees.id, refereeId))
      .limit(1);
    if (!row) {
      throw new Error("Árbitro no encontrado al actualizar metadata.");
    }
    const prev =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const next = { ...prev, ...patch };
    await tx
      .update(leagueReferees)
      .set({ metadata: next, updatedAt: new Date() })
      .where(eq(leagueReferees.id, refereeId));
  });
}

export async function deleteLeagueRefereeById(refereeId: string): Promise<void> {
  const db = getDb();
  await db.delete(leagueReferees).where(eq(leagueReferees.id, refereeId));
}
