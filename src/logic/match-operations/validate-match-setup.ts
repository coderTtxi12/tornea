import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { matches } from "@/db/schema";

import {
  mergeMatchReportMetadata,
  regulationMinutesFromHalves,
} from "@/logic/leagues/match-report-metadata";

import { loadMatchForOperations } from "./match-operations-access";
import {
  mergeMatchOperationsIntoReport,
  readMatchOperationsMetadata,
} from "./match-operations-metadata";

export type ValidateMatchSetupInput = {
  actorUserId: string;
  leagueId: string;
  matchId: string;
  playersOnFieldPerTeam: number;
  firstHalfMinutes: number;
  halftimeBreakMinutes: number;
  secondHalfMinutes: number;
};

export type ValidateMatchSetupResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "forbidden"
        | "not_found"
        | "invalid_status"
        | "invalid_phase"
        | "invalid_fields";
    };

export async function validateMatchSetup(
  input: ValidateMatchSetupInput,
): Promise<ValidateMatchSetupResult> {
  const loaded = await loadMatchForOperations(
    input.actorUserId,
    input.leagueId,
    input.matchId,
  );
  if (!loaded.ok) return loaded;

  const { ctx } = loaded;
  if (ctx.status === "finished" || ctx.status === "cancelled") {
    return { ok: false, reason: "invalid_status" };
  }

  const ops = readMatchOperationsMetadata(ctx.report);
  if (ops.operationsPhase === "closed") {
    return { ok: false, reason: "invalid_phase" };
  }

  const {
    playersOnFieldPerTeam,
    firstHalfMinutes,
    halftimeBreakMinutes,
    secondHalfMinutes,
  } = input;

  if (
    playersOnFieldPerTeam < 1 ||
    playersOnFieldPerTeam > 30 ||
    firstHalfMinutes < 1 ||
    firstHalfMinutes > 120 ||
    secondHalfMinutes < 1 ||
    secondHalfMinutes > 120 ||
    halftimeBreakMinutes < 0 ||
    halftimeBreakMinutes > 60
  ) {
    return { ok: false, reason: "invalid_fields" };
  }

  const report = mergeMatchReportMetadata(ctx.report, {
    playersOnFieldPerTeam,
    firstHalfMinutes,
    halftimeBreakMinutes,
    secondHalfMinutes,
  });
  const reportWithOps = mergeMatchOperationsIntoReport(report, {
    operationsPhase: "lineups",
    setupValidatedAt: new Date().toISOString(),
  });

  const db = getDb();
  await db
    .update(matches)
    .set({
      report: reportWithOps,
      regulationMinutes: regulationMinutesFromHalves(
        firstHalfMinutes,
        secondHalfMinutes,
      ),
      updatedAt: new Date(),
    })
    .where(eq(matches.id, input.matchId));

  return { ok: true };
}
