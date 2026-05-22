import { eq } from "drizzle-orm";

import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import { matches, sportMatchEvents } from "@/db/schema";

import { computeLiveScoreFromGoals } from "./compute-live-score";
import { applySeasonPointsFromResult } from "./apply-season-points-from-result";
import { loadMatchForOperations } from "./match-operations-access";
import {
  finishEventForMode,
  minuteFromClockElapsed,
} from "./match-clock-events";
import {
  mergeMatchOperationsIntoReport,
  readMatchOperationsMetadata,
} from "./match-operations-metadata";
import { getMatchOperationsBundle } from "./get-match-operations-bundle";

type DbTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function insertFinishMatchEvent(
  tx: DbTx,
  matchId: string,
  mode: FinishMatchMode,
  report: unknown,
) {
  const ops = readMatchOperationsMetadata(report);
  const clock = ops.clock ?? {
    period: "ended" as const,
    elapsedSeconds: 0,
    isPaused: true,
    periodStartedAt: null,
  };
  const finishEvent = finishEventForMode(
    mode.type === "played"
      ? { type: mode.type, homeScore: mode.homeScore, awayScore: mode.awayScore }
      : { type: mode.type },
  );
  const period =
    clock.period === "first_half" || clock.period === "second_half"
      ? clock.period
      : null;

  await tx.insert(sportMatchEvents).values({
    matchId,
    sportCode: "football",
    eventKey: finishEvent.eventKey,
    minute: minuteFromClockElapsed(clock.elapsedSeconds),
    period,
    payload: {
      finishType: mode.type,
      label: finishEvent.label,
      ...(mode.type === "played"
        ? { homeScore: mode.homeScore, awayScore: mode.awayScore }
        : {}),
      ...(mode.notes?.trim() ? { notes: mode.notes.trim() } : {}),
    },
  });
}

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
      await insertFinishMatchEvent(tx, input.matchId, input.mode, ctx.report);
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
      await insertFinishMatchEvent(tx, input.matchId, input.mode, ctx.report);
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
      await insertFinishMatchEvent(tx, input.matchId, input.mode, ctx.report);
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
    await insertFinishMatchEvent(tx, input.matchId, input.mode, ctx.report);
    await tx
      .update(matches)
      .set({
        status: "finished",
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
