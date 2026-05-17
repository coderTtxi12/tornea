/** Campos de reglas deportivas guardados en `league_categories.metadata`. */
export type LeagueCategoryMetadataFields = {
  birthYearMin: number | null;
  birthYearMax: number | null;
  minTeamsToStart: number | null;
};

function readOptionalInt(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isInteger(raw)) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number(raw);
    return Number.isInteger(n) ? n : null;
  }
  return null;
}

export function readLeagueCategoryMetadata(metadata: unknown): LeagueCategoryMetadataFields {
  const raw =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  return {
    birthYearMin: readOptionalInt(raw.birthYearMin),
    birthYearMax: readOptionalInt(raw.birthYearMax),
    minTeamsToStart: readOptionalInt(raw.minTeamsToStart),
  };
}

/** Parche de metadata: borra claves cuando el valor es `null`. */
export function mergeLeagueCategoryMetadata(
  prev: unknown,
  fields: LeagueCategoryMetadataFields,
): Record<string, unknown> {
  const base =
    prev && typeof prev === "object" && !Array.isArray(prev)
      ? { ...(prev as Record<string, unknown>) }
      : {};
  for (const key of ["birthYearMin", "birthYearMax", "minTeamsToStart"] as const) {
    const v = fields[key];
    if (v == null) {
      delete base[key];
    } else {
      base[key] = v;
    }
  }
  return base;
}
