import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { matches, sportMatchEvents } from "@/db/schema";

import {
  mergeMatchReportMetadata,
  readMatchReportMetadata,
} from "@/logic/leagues/match-report-metadata";

import { loadMatchForOperations } from "./match-operations-access";
import {
  MATCH_CLOCK_EVENT_KEYS,
  labelForAddedStoppageMinutes,
  matchClockEventForEndedPeriod,
  minuteFromClockElapsed,
} from "./match-clock-events";
import type { MatchClockPeriod } from "./match-operations-metadata";
import {
  effectiveMatchClock,
  mergeMatchOperationsIntoReport,
  readMatchOperationsMetadata,
} from "./match-operations-metadata";
import {
  effectivePeriodLimitSeconds,
  isNearPeriodLimit,
  resolveMatchDurationConfig,
  secondHalfAddedSecondsFromReport,
} from "./match-period-duration";

export type ClockAction = "pause" | "resume" | "end_period" | "add_stoppage";

export type TickMatchClockResult =
  | { ok: true; period: MatchClockPeriod }
  | {
      ok: false;
      reason:
        | "forbidden"
        | "not_found"
        | "not_live"
        | "no_clock"
        | "invalid_stoppage"
        | "not_second_half";
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
  options?: { stoppageMinutes?: number },
): Promise<TickMatchClockResult> {
  const loaded = await loadMatchForOperations(actorUserId, leagueId, matchId);
  if (!loaded.ok) return loaded;

  const { ctx } = loaded;
  if (ctx.status !== "live") return { ok: false, reason: "not_live" };

  const ops = readMatchOperationsMetadata(ctx.report);
  const clock = effectiveMatchClock(ops.clock);
  if (!clock) return { ok: false, reason: "no_clock" };

  const reportDuration = readMatchReportMetadata(ctx.report);
  const durationConfig = resolveMatchDurationConfig(reportDuration);
  const now = new Date();

  if (action === "add_stoppage") {
    const minutes = options?.stoppageMinutes;
    if (
      minutes == null ||
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > 30
    ) {
      return { ok: false, reason: "invalid_stoppage" };
    }
    if (clock.period !== "second_half") {
      return { ok: false, reason: "not_second_half" };
    }

    const addedBefore = secondHalfAddedSecondsFromReport(reportDuration);
    const limitSec = effectivePeriodLimitSeconds(
      "second_half",
      durationConfig,
      addedBefore,
    );
    if (limitSec == null || !isNearPeriodLimit(clock.elapsedSeconds, limitSec)) {
      return { ok: false, reason: "invalid_stoppage" };
    }

    const addedAfter = addedBefore + minutes * 60;
    const eventLabel = labelForAddedStoppageMinutes(minutes);
    const reportWithAdded = mergeMatchReportMetadata(ctx.report, {
      ...reportDuration,
      secondHalfAddedSeconds: addedAfter,
    });

    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(sportMatchEvents).values({
        matchId,
        sportCode: "football",
        eventKey: MATCH_CLOCK_EVENT_KEYS.addStoppageTime,
        minute: minuteFromClockElapsed(clock.elapsedSeconds),
        period: "second_half",
        payload: {
          addedMinutes: minutes,
          totalAddedSeconds: addedAfter,
          label: eventLabel,
        },
      });
      await tx
        .update(matches)
        .set({ report: reportWithAdded, updatedAt: now })
        .where(eq(matches.id, matchId));
    });

    return { ok: true, period: clock.period };
  }

  let next = { ...clock };

  if (action === "pause") {
    next.isPaused = true;
    next.periodStartedAt = null;
  } else if (action === "resume") {
    next.isPaused = false;
    next.periodStartedAt = now.toISOString();
  } else if (action === "end_period") {
    const endedPeriod = next.period;
    const period = nextPeriod(endedPeriod);
    next = {
      period,
      elapsedSeconds: 0,
      isPaused: period === "halftime" || period === "ended",
      periodStartedAt: period === "halftime" || period === "ended" ? null : now.toISOString(),
    };
    void reportDuration;

    const clockEvent = matchClockEventForEndedPeriod(endedPeriod);
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

    await db.transaction(async (tx) => {
      if (clockEvent) {
        await tx.insert(sportMatchEvents).values({
          matchId,
          sportCode: "football",
          eventKey: clockEvent.eventKey,
          minute: minuteFromClockElapsed(clock.elapsedSeconds),
          period: clockEvent.dbPeriod,
          payload: {
            endedPeriod,
            nextPeriod: period,
            label: clockEvent.label,
          },
        });
      }
      await tx.update(matches).set(updates).where(eq(matches.id, matchId));
    });

    return { ok: true, period: next.period };
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
