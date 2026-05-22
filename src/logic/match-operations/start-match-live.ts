import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { matches, sportMatchEvents } from "@/db/schema";

import { loadMatchForOperations } from "./match-operations-access";
import { MATCH_CLOCK_EVENT_KEYS } from "./match-clock-events";
import {
  initialClockForKickoff,
  mergeMatchOperationsIntoReport,
  readMatchOperationsMetadata,
} from "./match-operations-metadata";

export type StartMatchLiveResult =
  | { ok: true }
  | {
      ok: false;
      reason: "forbidden" | "not_found" | "invalid_phase" | "invalid_status";
    };

export async function startMatchLive(
  actorUserId: string,
  leagueId: string,
  matchId: string,
): Promise<StartMatchLiveResult> {
  const loaded = await loadMatchForOperations(actorUserId, leagueId, matchId);
  if (!loaded.ok) return loaded;

  const { ctx } = loaded;
  const ops = readMatchOperationsMetadata(ctx.report);
  if (ops.operationsPhase !== "ready") {
    return { ok: false, reason: "invalid_phase" };
  }
  if (ctx.status === "finished" || ctx.status === "cancelled") {
    return { ok: false, reason: "invalid_status" };
  }

  const reportWithOps = mergeMatchOperationsIntoReport(ctx.report, {
    operationsPhase: "live",
    clock: initialClockForKickoff(),
  });

  const db = getDb();
  const kickoffAt = ctx.startedAt ?? new Date();
  await db.transaction(async (tx) => {
    await tx.insert(sportMatchEvents).values({
      matchId,
      sportCode: "football",
      eventKey: MATCH_CLOCK_EVENT_KEYS.matchStarted,
      minute: 0,
      period: "first_half",
      payload: { label: "Inicio del partido" },
    });
    await tx
      .update(matches)
      .set({
        status: "live",
        startedAt: kickoffAt,
        report: reportWithOps,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, matchId));
  });

  return { ok: true };
}
