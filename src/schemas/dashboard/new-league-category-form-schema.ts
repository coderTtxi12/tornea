import { z } from "zod";

/** Valores de `league_category_gender` en PostgreSQL. */
export const leagueCategoryGenderValues = ["male", "female", "mixed", "unspecified"] as const;

export const leagueCategoryGenderSchema = z.enum(leagueCategoryGenderValues);

const MIN_BIRTH_YEAR = 1900;

function maxAllowedBirthYear(): number {
  return new Date().getFullYear() + 1;
}

export const newLeagueCategoryJsonSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre de la categoría es obligatorio.").max(120),
    gender: leagueCategoryGenderSchema,
    /** Año de nacimiento permitido más antiguo (límite inferior del rango, ej. 2008). Opcional. */
    birthYearMin: z.union([z.number().int(), z.null()]).optional(),
    /** Año de nacimiento permitido más reciente (límite superior del rango, ej. 2010). Opcional. */
    birthYearMax: z.union([z.number().int(), z.null()]).optional(),
    minTeamsToStart: z.union([z.number().int().min(1).max(9999), z.null()]).optional(),
  })
  .superRefine((data, ctx) => {
    const hi = maxAllowedBirthYear();
    for (const key of ["birthYearMin", "birthYearMax"] as const) {
      const v = data[key] ?? null;
      if (v == null) continue;
      if (v < MIN_BIRTH_YEAR || v > hi) {
        ctx.addIssue({
          code: "custom",
          message: `Usá un año entre ${MIN_BIRTH_YEAR} y ${hi}.`,
          path: [key],
        });
      }
    }
    const min = data.birthYearMin ?? null;
    const max = data.birthYearMax ?? null;
    if (min != null && max != null && min > max) {
      ctx.addIssue({
        code: "custom",
        message: "El año de nacimiento mínimo no puede ser mayor que el máximo.",
        path: ["birthYearMax"],
      });
    }
  });

export type NewLeagueCategoryJson = z.infer<typeof newLeagueCategoryJsonSchema>;

export const leagueCategoryGenderOptions: ReadonlyArray<{
  value: (typeof leagueCategoryGenderValues)[number];
  label: string;
}> = [
  { value: "male", label: "Varonil (masculino)" },
  { value: "female", label: "Femenil" },
  { value: "mixed", label: "Mixto" },
  { value: "unspecified", label: "Sin especificar" },
];
