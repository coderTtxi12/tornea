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

export {
  BIRTH_DATE_MIN_ISO,
  birthDateMaxIso,
  localIsoDateString,
  validateBirthDateIso,
} from "@/logic/players/birth-date-validation";
