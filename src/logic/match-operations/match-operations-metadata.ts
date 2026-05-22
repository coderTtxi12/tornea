/** Workflow state in `matches.report` (match sheet operations). */

export type MatchOperationsPhase =
  | "setup"
  | "lineups"
  | "ready"
  | "live"
  | "closed";

export type MatchClockPeriod = "first_half" | "halftime" | "second_half" | "ended";

export type MatchClockState = {
  period: MatchClockPeriod;
  /** Seconds elapsed in the current period segment. */
  elapsedSeconds: number;
  isPaused: boolean;
  periodStartedAt: string | null;
};

export type MatchOperationsMetadata = {
  operationsPhase: MatchOperationsPhase;
  setupValidatedAt: string | null;
  lineupsValidatedAt: string | null;
  clock: MatchClockState | null;
};

const DEFAULT_CLOCK: MatchClockState = {
  period: "first_half",
  elapsedSeconds: 0,
  isPaused: true,
  periodStartedAt: null,
};

export function defaultMatchOperationsMetadata(): MatchOperationsMetadata {
  return {
    operationsPhase: "setup",
    setupValidatedAt: null,
    lineupsValidatedAt: null,
    clock: null,
  };
}

function readIso(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  return Number.isNaN(Date.parse(raw)) ? null : raw;
}

export function readMatchOperationsMetadata(report: unknown): MatchOperationsMetadata {
  const raw =
    report && typeof report === "object" && !Array.isArray(report)
      ? (report as Record<string, unknown>)
      : {};
  const phaseRaw = raw.operationsPhase;
  const phase: MatchOperationsPhase =
    phaseRaw === "lineups" ||
    phaseRaw === "ready" ||
    phaseRaw === "live" ||
    phaseRaw === "closed"
      ? phaseRaw
      : "setup";

  let clock: MatchClockState | null = null;
  if (raw.clock && typeof raw.clock === "object" && !Array.isArray(raw.clock)) {
    const c = raw.clock as Record<string, unknown>;
    const p = c.period;
    const period: MatchClockPeriod =
      p === "halftime" || p === "second_half" || p === "ended" ? p : "first_half";
    clock = {
      period,
      elapsedSeconds:
        typeof c.elapsedSeconds === "number" && c.elapsedSeconds >= 0
          ? Math.floor(c.elapsedSeconds)
          : 0,
      isPaused: c.isPaused !== false,
      periodStartedAt: readIso(c.periodStartedAt),
    };
  }

  return {
    operationsPhase: phase,
    setupValidatedAt: readIso(raw.setupValidatedAt),
    lineupsValidatedAt: readIso(raw.lineupsValidatedAt),
    clock,
  };
}

export function mergeMatchOperationsIntoReport(
  prev: unknown,
  patch: Partial<MatchOperationsMetadata>,
): Record<string, unknown> {
  const base =
    prev && typeof prev === "object" && !Array.isArray(prev)
      ? { ...(prev as Record<string, unknown>) }
      : {};
  const current = readMatchOperationsMetadata(base);

  if (patch.operationsPhase !== undefined) {
    base.operationsPhase = patch.operationsPhase;
  }
  if (patch.setupValidatedAt !== undefined) {
    if (patch.setupValidatedAt == null) delete base.setupValidatedAt;
    else base.setupValidatedAt = patch.setupValidatedAt;
  }
  if (patch.lineupsValidatedAt !== undefined) {
    if (patch.lineupsValidatedAt == null) delete base.lineupsValidatedAt;
    else base.lineupsValidatedAt = patch.lineupsValidatedAt;
  }
  if (patch.clock !== undefined) {
    if (patch.clock == null) delete base.clock;
    else base.clock = patch.clock;
  }

  if (patch.clock === undefined && current.clock && !base.clock) {
    base.clock = current.clock;
  }

  return base;
}

export function initialClockForKickoff(): MatchClockState {
  return {
    ...DEFAULT_CLOCK,
    isPaused: false,
    periodStartedAt: new Date().toISOString(),
  };
}
