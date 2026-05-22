import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { matches } from "@/db/schema";

import { computeLiveScoreFromGoals } from "./compute-live-score";
import { applySeasonPointsFromResult } from "./apply-season-points-from-result";
import { loadMatchForOperations } from "./match-operations-access";
import { mergeMatchOperationsIntoReport } from "./match-operations-metadata";
import { getMatchOperationsBundle } from "./get-match-operations-bundle";

export type FinishMatchMode =
  | { type: "played"; homeScore: number; awayScore: number; notes?: string | null }
  | { type: "walkover_home"; notes?: string | null }
  | { type: "walkover_away"; notes?: string | null }
  | { type: "both_no_show"; notes?: string | null };

export type FinishMatchInput = {
  actorUserId: string;
  leagueId: string;
  matchId: string;
  mode: FinishMatchMode;
};

export type FinishMatchResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "forbidden"
        | "not_found"
        | "invalid_status"
        | "score_mismatch";
    };

export async function finishMatch(input: FinishMatchInput): Promise<FinishMatchResult> {
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

  const bundle = await getMatchOperationsBundle(
    input.actorUserId,
    input.leagueId,
    input.matchId,
  );
  if (!bundle.ok) return { ok: false, reason: "not_found" };

  const db = getDb();
  const now = new Date();
  let status: "finished" | "walkover" = "finished";
  let homeScore = 0;
  let awayScore = 0;
  const notesFromInput = input.mode.notes?.trim() || null;

  if (input.mode.type === "both_no_show") {
    status = "walkover";
    homeScore = 0;
    awayScore = 0;
    await db.transaction(async (tx) => {
      await applySeasonPointsFromResult(tx, ctx.seasonId, ctx.homeTeamId, ctx.awayTeamId, {
        kind: "both_no_show",
      });
      await tx
        .update(matches)
        .set({
          status,
          homeScore,
          awayScore,
          endedAt: now,
          notes: notesFromInput,
          report: mergeMatchOperationsIntoReport(ctx.report, {
            operationsPhase: "closed",
            clock: { period: "ended", elapsedSeconds: 0, isPaused: true, periodStartedAt: null },
          }),
          updatedAt: now,
        })
        .where(eq(matches.id, input.matchId));
    });
    return { ok: true };
  }

  if (input.mode.type === "walkover_home") {
    status = "walkover";
    homeScore = 3;
    awayScore = 0;
    await db.transaction(async (tx) => {
      await applySeasonPointsFromResult(tx, ctx.seasonId, ctx.homeTeamId, ctx.awayTeamId, {
        kind: "walkover",
        winnerTeamId: ctx.homeTeamId,
        loserTeamId: ctx.awayTeamId,
      });
      await tx
        .update(matches)
        .set({
          status,
          homeScore,
          awayScore,
          endedAt: now,
          report: mergeMatchOperationsIntoReport(ctx.report, { operationsPhase: "closed" }),
          updatedAt: now,
        })
        .where(eq(matches.id, input.matchId));
    });
    return { ok: true };
  }

  if (input.mode.type === "walkover_away") {
    status = "walkover";
    homeScore = 0;
    awayScore = 3;
    await db.transaction(async (tx) => {
      await applySeasonPointsFromResult(tx, ctx.seasonId, ctx.homeTeamId, ctx.awayTeamId, {
        kind: "walkover",
        winnerTeamId: ctx.awayTeamId,
        loserTeamId: ctx.homeTeamId,
      });
      await tx
        .update(matches)
        .set({
          status,
          homeScore,
          awayScore,
          endedAt: now,
          report: mergeMatchOperationsIntoReport(ctx.report, { operationsPhase: "closed" }),
          updatedAt: now,
        })
        .where(eq(matches.id, input.matchId));
    });
    return { ok: true };
  }

  homeScore = input.mode.homeScore;
  awayScore = input.mode.awayScore;
  const fromGoals = computeLiveScoreFromGoals(
    bundle.bundle.goals.map((g) => ({
      teamId: g.teamId,
      isOwnGoal: g.isOwnGoal,
      homeTeamId: ctx.homeTeamId,
      awayTeamId: ctx.awayTeamId,
    })),
    ctx.homeTeamId,
    ctx.awayTeamId,
  );

  if (
    fromGoals.home !== homeScore ||
    fromGoals.away !== awayScore
  ) {
    if (!notesFromInput) {
      return { ok: false, reason: "score_mismatch" };
    }
  }

  await db.transaction(async (tx) => {
    await applySeasonPointsFromResult(tx, ctx.seasonId, ctx.homeTeamId, ctx.awayTeamId, {
      kind: "played",
      homeScore,
      awayScore,
    });
    await tx
      .update(matches)
      .set({
        status: "finished",
        homeScore,
        awayScore,
        endedAt: now,
        notes: notesFromInput,
        report: mergeMatchOperationsIntoReport(ctx.report, { operationsPhase: "closed" }),
        updatedAt: now,
      })
      .where(eq(matches.id, input.matchId));
  });

  return { ok: true };
}
