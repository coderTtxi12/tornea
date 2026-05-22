import { matchMinuteFromElapsedSeconds } from "./elapsed-minute";
import type { MatchClockPeriod } from "./match-operations-metadata";

export const MATCH_CLOCK_EVENT_KEYS = {
  endFirstHalf: "football.end_first_half",
  endHalftime: "football.end_halftime",
  endSecondHalf: "football.end_second_half",
  matchStarted: "football.match_started",
  addStoppageTime: "football.add_stoppage_time",
} as const;

export const MATCH_FINISH_EVENT_KEYS = {
  matchFinished: "football.match_finished",
  walkoverAwayNoShow: "football.walkover_away_no_show",
  walkoverHomeNoShow: "football.walkover_home_no_show",
  bothNoShow: "football.both_no_show",
} as const;

export type MatchClockEventKey =
  (typeof MATCH_CLOCK_EVENT_KEYS)[keyof typeof MATCH_CLOCK_EVENT_KEYS];

const EVENT_LABELS: Record<MatchClockEventKey, string> = {
  [MATCH_CLOCK_EVENT_KEYS.endFirstHalf]: "Fin 1.er tiempo",
  [MATCH_CLOCK_EVENT_KEYS.endHalftime]: "Fin descanso",
  [MATCH_CLOCK_EVENT_KEYS.endSecondHalf]: "Fin 2.º tiempo",
  [MATCH_CLOCK_EVENT_KEYS.matchStarted]: "Inicio del partido",
  [MATCH_CLOCK_EVENT_KEYS.addStoppageTime]: "Tiempo añadido",
};

const FINISH_EVENT_LABELS: Record<string, string> = {
  [MATCH_FINISH_EVENT_KEYS.matchFinished]: "Partido finalizado",
  [MATCH_FINISH_EVENT_KEYS.walkoverAwayNoShow]: "No presentación visitante (3–0 local)",
  [MATCH_FINISH_EVENT_KEYS.walkoverHomeNoShow]: "No presentación local (3–0 visitante)",
  [MATCH_FINISH_EVENT_KEYS.bothNoShow]: "Ambos ausentes (0 pts)",
};

export function labelForAddedStoppageMinutes(minutes: number): string {
  return `+${minutes} min tiempo extra`;
}

/** Label for the period-end button while that period is active (same as the logged event). */
export function periodEndActionLabel(period: MatchClockPeriod | undefined): string {
  switch (period) {
    case "first_half":
      return EVENT_LABELS[MATCH_CLOCK_EVENT_KEYS.endFirstHalf];
    case "halftime":
      return EVENT_LABELS[MATCH_CLOCK_EVENT_KEYS.endHalftime];
    case "second_half":
      return EVENT_LABELS[MATCH_CLOCK_EVENT_KEYS.endSecondHalf];
    default:
      return "Fin periodo";
  }
}

export function labelForMatchClockEventKey(eventKey: string): string {
  return (
    (EVENT_LABELS as Record<string, string>)[eventKey] ??
    FINISH_EVENT_LABELS[eventKey] ??
    eventKey
  );
}

export function finishEventForMode(mode: {
  type: "played" | "walkover_home" | "walkover_away" | "both_no_show";
  homeScore?: number;
  awayScore?: number;
}): { eventKey: string; label: string } {
  switch (mode.type) {
    case "walkover_away":
      return {
        eventKey: MATCH_FINISH_EVENT_KEYS.walkoverAwayNoShow,
        label: FINISH_EVENT_LABELS[MATCH_FINISH_EVENT_KEYS.walkoverAwayNoShow],
      };
    case "walkover_home":
      return {
        eventKey: MATCH_FINISH_EVENT_KEYS.walkoverHomeNoShow,
        label: FINISH_EVENT_LABELS[MATCH_FINISH_EVENT_KEYS.walkoverHomeNoShow],
      };
    case "both_no_show":
      return {
        eventKey: MATCH_FINISH_EVENT_KEYS.bothNoShow,
        label: FINISH_EVENT_LABELS[MATCH_FINISH_EVENT_KEYS.bothNoShow],
      };
    case "played":
      return {
        eventKey: MATCH_FINISH_EVENT_KEYS.matchFinished,
        label: `Partido finalizado (${mode.homeScore ?? 0}–${mode.awayScore ?? 0})`,
      };
  }
}

export function matchClockEventForEndedPeriod(endedPeriod: MatchClockPeriod): {
  eventKey: MatchClockEventKey;
  label: string;
  dbPeriod: "first_half" | "second_half" | null;
} | null {
  switch (endedPeriod) {
    case "first_half":
      return {
        eventKey: MATCH_CLOCK_EVENT_KEYS.endFirstHalf,
        label: EVENT_LABELS[MATCH_CLOCK_EVENT_KEYS.endFirstHalf],
        dbPeriod: "first_half",
      };
    case "halftime":
      return {
        eventKey: MATCH_CLOCK_EVENT_KEYS.endHalftime,
        label: EVENT_LABELS[MATCH_CLOCK_EVENT_KEYS.endHalftime],
        dbPeriod: null,
      };
    case "second_half":
      return {
        eventKey: MATCH_CLOCK_EVENT_KEYS.endSecondHalf,
        label: EVENT_LABELS[MATCH_CLOCK_EVENT_KEYS.endSecondHalf],
        dbPeriod: "second_half",
      };
    default:
      return null;
  }
}

export function minuteFromClockElapsed(elapsedSeconds: number): number | null {
  if (elapsedSeconds <= 0) return null;
  return matchMinuteFromElapsedSeconds(elapsedSeconds);
}
