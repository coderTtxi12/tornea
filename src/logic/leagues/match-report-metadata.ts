/** Valores por partido en `matches.report` (no modifica `league_categories`). */
export type MatchReportMetadataFields = {
  playersOnFieldPerTeam: number | null;
  firstHalfMinutes: number | null;
  halftimeBreakMinutes: number | null;
  secondHalfMinutes: number | null;
};

const REPORT_INT_KEYS = [
  "playersOnFieldPerTeam",
  "firstHalfMinutes",
  "halftimeBreakMinutes",
  "secondHalfMinutes",
] as const satisfies readonly (keyof MatchReportMetadataFields)[];

function readOptionalInt(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isInteger(raw)) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number(raw);
    return Number.isInteger(n) ? n : null;
  }
  return null;
}

export function readMatchReportMetadata(report: unknown): MatchReportMetadataFields {
  const raw =
    report && typeof report === "object" && !Array.isArray(report)
      ? (report as Record<string, unknown>)
      : {};
  return {
    playersOnFieldPerTeam: readOptionalInt(raw.playersOnFieldPerTeam),
    firstHalfMinutes: readOptionalInt(raw.firstHalfMinutes),
    halftimeBreakMinutes: readOptionalInt(raw.halftimeBreakMinutes),
    secondHalfMinutes: readOptionalInt(raw.secondHalfMinutes),
  };
}

/** Parche de `report`: borra claves cuando el valor es `null`. */
export function mergeMatchReportMetadata(
  prev: unknown,
  fields: MatchReportMetadataFields,
): Record<string, unknown> {
  const base =
    prev && typeof prev === "object" && !Array.isArray(prev)
      ? { ...(prev as Record<string, unknown>) }
      : {};
  for (const key of REPORT_INT_KEYS) {
    const v = fields[key];
    if (v == null) {
      delete base[key];
    } else {
      base[key] = v;
    }
  }
  return base;
}

/** Minutos reglamentarios en cancha (sin descanso). */
export function regulationMinutesFromHalves(
  firstHalf: number,
  secondHalf: number,
): number {
  return firstHalf + secondHalf;
}
