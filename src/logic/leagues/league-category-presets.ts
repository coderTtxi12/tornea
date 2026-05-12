/**
 * Presets de categorías de liga que se muestran como chips en el formulario "Nueva liga".
 * Quien crea la liga puede elegir cero o varias; cada preset se persiste como fila en
 * `league_categories` cuando la liga se crea.
 *
 * Mantén `code` estable (se usa para deduplicar por `(league_id, lower(code))`).
 */

export type LeagueCategoryGender = "male" | "female" | "mixed" | "unspecified";

export type LeagueCategoryPreset = {
  code: string;
  name: string;
  gender: LeagueCategoryGender;
  ageMin: number | null;
  ageMax: number | null;
};

export const LEAGUE_CATEGORY_PRESETS: readonly LeagueCategoryPreset[] = [
  { code: "varonil", name: "Varonil", gender: "male", ageMin: null, ageMax: null },
  { code: "femenil", name: "Femenil", gender: "female", ageMin: null, ageMax: null },
  { code: "mixto", name: "Mixto", gender: "mixed", ageMin: null, ageMax: null },
  { code: "sub_13", name: "Sub-13", gender: "unspecified", ageMin: null, ageMax: 13 },
  { code: "sub_15", name: "Sub-15", gender: "unspecified", ageMin: null, ageMax: 15 },
  { code: "sub_17", name: "Sub-17", gender: "unspecified", ageMin: null, ageMax: 17 },
  { code: "libre", name: "Libre", gender: "unspecified", ageMin: null, ageMax: null },
] as const;

export function findCategoryPresetByCode(
  code: string,
): LeagueCategoryPreset | null {
  const normalized = code.trim().toLowerCase();
  return (
    LEAGUE_CATEGORY_PRESETS.find((p) => p.code === normalized) ?? null
  );
}
