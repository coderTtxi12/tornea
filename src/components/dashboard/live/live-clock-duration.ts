import type { MatchReportMetadataFields } from "@/logic/leagues/match-report-metadata";
import {
  effectivePeriodLimitSeconds,
  isNearPeriodLimit,
  periodDurationMinutes,
  resolveMatchDurationConfig,
  secondHalfAddedSecondsFromReport,
  type MatchDurationConfig,
} from "@/logic/match-operations/match-period-duration";
import type { MatchClockPeriod } from "@/logic/match-operations/match-operations-metadata";

export type { MatchDurationConfig };
export {
  effectivePeriodLimitSeconds,
  isNearPeriodLimit,
  periodDurationMinutes,
  resolveMatchDurationConfig,
  secondHalfAddedSecondsFromReport,
};

export type ClockElapsedTone = "normal" | "warning" | "over";

const PERIOD_DURATION_LABELS: Record<string, string> = {
  first_half: "1.er tiempo",
  halftime: "Descanso",
  second_half: "2.º tiempo",
};

export function periodDurationCaption(
  period: MatchClockPeriod | undefined,
  config: MatchDurationConfig,
  secondHalfAddedSeconds = 0,
): string | null {
  const limitSec = effectivePeriodLimitSeconds(period, config, secondHalfAddedSeconds);
  if (limitSec == null) return null;
  const name = PERIOD_DURATION_LABELS[period ?? ""] ?? "Periodo";
  const limitMin = Math.ceil(limitSec / 60);
  return `${name} · ${limitMin} min`;
}

export function clockElapsedTone(
  elapsedSeconds: number,
  limitMinutesOrSeconds: number,
  unit: "minutes" | "seconds" = "minutes",
): ClockElapsedTone {
  const limitSec = unit === "seconds" ? limitMinutesOrSeconds : limitMinutesOrSeconds * 60;
  if (limitSec <= 0) return "normal";
  if (elapsedSeconds >= limitSec) return "over";
  if (isNearPeriodLimit(elapsedSeconds, limitSec)) return "warning";
  return "normal";
}

export function clockToneTextClass(tone: ClockElapsedTone): string {
  switch (tone) {
    case "warning":
      return "text-brand-teal";
    case "over":
      return "text-brand-purple";
    default:
      return "text-brand-lime";
  }
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatClockAgainstLimit(
  elapsedSeconds: number,
  limitMinutes: number,
): string {
  return `${formatClock(elapsedSeconds)} / ${formatClock(limitMinutes * 60)}`;
}

export function formatLiveClockHeaderLabel(
  period: MatchClockPeriod,
  elapsedSeconds: number,
  config: MatchDurationConfig,
  secondHalfAddedSeconds = 0,
): string {
  const periodName = PERIOD_DURATION_LABELS[period] ?? period;
  const limitSec = effectivePeriodLimitSeconds(period, config, secondHalfAddedSeconds);
  const time = formatClock(elapsedSeconds);
  if (limitSec == null) return `${periodName} · ${time}`;
  const limitMinutes = Math.ceil(limitSec / 60);
  return `${periodName} · ${formatClockAgainstLimit(elapsedSeconds, limitMinutes)}`;
}
