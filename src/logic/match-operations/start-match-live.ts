import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { matches } from "@/db/schema";

import { loadMatchForOperations } from "./match-operations-access";
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
  await db
    .update(matches)
    .set({
      status: "live",
      startedAt: ctx.startedAt ?? new Date(),
      report: reportWithOps,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));

  return { ok: true };
}
