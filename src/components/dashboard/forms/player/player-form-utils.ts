import type { MyLeaguesTeamRow } from "@/components/dashboard/leagues/my-leagues-state";

export function normalizeForSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function teamDisplayLabel(t: MyLeaguesTeamRow): string {
  return `${t.name} — ${t.leagueName}${t.categoryName ? ` · ${t.categoryName}` : ""}`;
}

export function teamMatchesQuery(t: MyLeaguesTeamRow, queryNorm: string): boolean {
  if (!queryNorm) return true;
  const haystack = normalizeForSearch(
    [t.name, t.shortName ?? "", t.leagueName, t.categoryName ?? ""].join(" | "),
  );
  return haystack.includes(queryNorm);
}

/** Fecha local `YYYY-MM-DD` (límite superior de nacimiento = hoy). */
export function localIsoDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
