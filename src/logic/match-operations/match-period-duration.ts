import type { MatchReportMetadataFields } from "@/logic/leagues/match-report-metadata";

import type { MatchClockPeriod } from "./match-operations-metadata";

export type MatchDurationConfig = {
  firstHalfMinutes: number;
  halftimeBreakMinutes: number;
  secondHalfMinutes: number;
};

const DEFAULT_DURATIONS: MatchDurationConfig = {
  firstHalfMinutes: 45,
  halftimeBreakMinutes: 15,
  secondHalfMinutes: 45,
};

/** Muestra aviso cuando queda ~15% o menos de 2 min del periodo. */
const WARNING_REMAINING_RATIO = 0.15;
const WARNING_REMAINING_SECONDS = 120;

export function resolveMatchDurationConfig(
  report: Pick<
    MatchReportMetadataFields,
    "firstHalfMinutes" | "halftimeBreakMinutes" | "secondHalfMinutes"
  >,
): MatchDurationConfig {
  return {
    firstHalfMinutes: report.firstHalfMinutes ?? DEFAULT_DURATIONS.firstHalfMinutes,
    halftimeBreakMinutes:
      report.halftimeBreakMinutes ?? DEFAULT_DURATIONS.halftimeBreakMinutes,
    secondHalfMinutes: report.secondHalfMinutes ?? DEFAULT_DURATIONS.secondHalfMinutes,
  };
}

export function periodDurationMinutes(
  period: MatchClockPeriod | undefined,
  config: MatchDurationConfig,
): number | null {
  switch (period) {
    case "first_half":
      return config.firstHalfMinutes;
    case "halftime":
      return config.halftimeBreakMinutes;
    case "second_half":
      return config.secondHalfMinutes;
    default:
      return null;
  }
}

export function secondHalfAddedSecondsFromReport(
  report: Pick<MatchReportMetadataFields, "secondHalfAddedSeconds">,
): number {
  const v = report.secondHalfAddedSeconds;
  return typeof v === "number" && v > 0 ? v : 0;
}

export function effectivePeriodLimitSeconds(
  period: MatchClockPeriod | undefined,
  config: MatchDurationConfig,
  secondHalfAddedSeconds = 0,
): number | null {
  const baseMinutes = periodDurationMinutes(period, config);
  if (baseMinutes == null) return null;
  let sec = baseMinutes * 60;
  if (period === "second_half") sec += secondHalfAddedSeconds;
  return sec;
}

export function isNearPeriodLimit(elapsedSeconds: number, limitSeconds: number): boolean {
  if (limitSeconds <= 0) return false;
  if (elapsedSeconds >= limitSeconds) return true;
  const remaining = limitSeconds - elapsedSeconds;
  const warnByRatio = limitSeconds * WARNING_REMAINING_RATIO;
  return remaining <= Math.max(warnByRatio, WARNING_REMAINING_SECONDS);
}
