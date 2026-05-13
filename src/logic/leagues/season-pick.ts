/** Filas mínimas para elegir la temporada “activa” de una liga (misma heurística que el dashboard de ligas). */
export type SeasonPickRow = {
  id: string;
  status: string;
  startsOn: Date | string | null;
};

function seasonPickPriority(status: string): number {
  switch (status) {
    case "in_progress":
      return 0;
    case "scheduled":
      return 1;
    case "completed":
      return 2;
    case "cancelled":
      return 3;
    default:
      return 9;
  }
}

function dateSortKey(d: Date | string | null): number {
  if (d == null) return 0;
  const t = typeof d === "string" ? Date.parse(d) : d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Elige una temporada por liga: prioriza en curso / programada y la más reciente por fecha de inicio.
 */
export function pickTargetSeasonIdFromCandidates(rows: SeasonPickRow[]): string | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => {
    const pa = seasonPickPriority(a.status);
    const pb = seasonPickPriority(b.status);
    if (pa !== pb) return pa - pb;
    return dateSortKey(b.startsOn) - dateSortKey(a.startsOn);
  });
  return sorted[0]?.id ?? null;
}
