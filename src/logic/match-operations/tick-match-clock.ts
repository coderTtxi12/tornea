import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { matches } from "@/db/schema";

import { readMatchReportMetadata } from "@/logic/leagues/match-report-metadata";

import { loadMatchForOperations } from "./match-operations-access";
import type { MatchClockPeriod } from "./match-operations-metadata";
import {
  effectiveMatchClock,
  mergeMatchOperationsIntoReport,
  readMatchOperationsMetadata,
} from "./match-operations-metadata";

export type ClockAction = "pause" | "resume" | "end_period";

export type TickMatchClockResult =
  | { ok: true; period: MatchClockPeriod }
  | {
      ok: false;
      reason: "forbidden" | "not_found" | "not_live" | "no_clock";
    };

function nextPeriod(current: MatchClockPeriod): MatchClockPeriod {
  switch (current) {
    case "first_half":
      return "halftime";
    case "halftime":
      return "second_half";
    case "second_half":
      return "ended";
    default:
      return "ended";
  }
}

export async function tickMatchClock(
  actorUserId: string,
  leagueId: string,
  matchId: string,
  action: ClockAction,
): Promise<TickMatchClockResult> {
  const loaded = await loadMatchForOperations(actorUserId, leagueId, matchId);
  if (!loaded.ok) return loaded;

  const { ctx } = loaded;
  if (ctx.status !== "live") return { ok: false, reason: "not_live" };

  const ops = readMatchOperationsMetadata(ctx.report);
  const clock = effectiveMatchClock(ops.clock);
  if (!clock) return { ok: false, reason: "no_clock" };

  const reportDuration = readMatchReportMetadata(ctx.report);
  const now = new Date();

  let next = { ...clock };

  if (action === "pause") {
    next.isPaused = true;
    next.periodStartedAt = null;
  } else if (action === "resume") {
    next.isPaused = false;
    next.periodStartedAt = now.toISOString();
  } else if (action === "end_period") {
    const period = nextPeriod(next.period);
    next = {
      period,
      elapsedSeconds: 0,
      isPaused: period === "halftime" || period === "ended",
      periodStartedAt: period === "halftime" || period === "ended" ? null : now.toISOString(),
    };
    void reportDuration;
  }

  const reportWithOps = mergeMatchOperationsIntoReport(ctx.report, {
    clock: next,
  });

  const db = getDb();
  const updates: Partial<typeof matches.$inferInsert> = {
    report: reportWithOps,
    updatedAt: now,
  };
  if (next.period === "ended") {
    updates.endedAt = now;
  }

  await db.update(matches).set(updates).where(eq(matches.id, matchId));

  return { ok: true, period: next.period };
}
