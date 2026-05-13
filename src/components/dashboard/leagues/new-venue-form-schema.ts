import { z } from "zod";

export const venueSurfacePresetSchema = z.enum([
  "natural_grass",
  "natural_hybrid",
  "synthetic_fifa2",
  "synthetic_other",
  "parquet",
  "dirt_sand",
  "vinyl",
  "concrete",
  "other",
]);

export type VenueSurfacePreset = z.infer<typeof venueSurfacePresetSchema>;

export const venueSurfacePresetOptions: readonly {
  value: VenueSurfacePreset;
  label: string;
}[] = [
  { value: "natural_grass", label: "Césped natural" },
  { value: "natural_hybrid", label: "Césped natural (híbrido)" },
  { value: "synthetic_fifa2", label: "Sintético FIFA 2★" },
  { value: "synthetic_other", label: "Sintético (otro certificado)" },
  { value: "parquet", label: "Parquet / polivalente" },
  { value: "dirt_sand", label: "Tierra / arena" },
  { value: "vinyl", label: "Taraflex / vinilo" },
  { value: "concrete", label: "Cemento / concreto" },
  { value: "other", label: "Otro (especificar)" },
] as const;

const presetLabels: Record<Exclude<VenueSurfacePreset, "other">, string> = {
  natural_grass: "Césped natural",
  natural_hybrid: "Césped natural (híbrido)",
  synthetic_fifa2: "Sintético FIFA 2★",
  synthetic_other: "Sintético (otro certificado)",
  parquet: "Parquet / polivalente",
  dirt_sand: "Tierra / arena",
  vinyl: "Taraflex / vinilo",
  concrete: "Cemento / concreto",
};

export function venueSurfaceDisplayLabel(
  preset: VenueSurfacePreset,
  customSurface: string,
): string {
  if (preset === "other") {
    return customSurface.trim();
  }
  return presetLabels[preset];
}

export const newVenueFormFieldsSchema = z
  .object({
    name: z.string().trim().min(1, "Indica el nombre de la cancha.").max(200),
    address: z.string().trim().min(1, "Indica la dirección.").max(500),
    surfacePreset: venueSurfacePresetSchema,
    surfaceCustom: z.string().trim().max(120).optional().default(""),
    availabilityNotes: z.string().trim().max(2000).optional().default(""),
  })
  .superRefine((val, ctx) => {
    if (val.surfacePreset === "other" && val.surfaceCustom.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Especificá el tipo de superficie.",
        path: ["surfaceCustom"],
      });
    }
  });

export type NewVenueFormFields = z.infer<typeof newVenueFormFieldsSchema>;

/** Interpreta `venues.metadata` guardado (incl. filas previas sin `surfacePreset`). */
export function parseVenueMetadataForEditForm(metadata: unknown): {
  surfacePreset: VenueSurfacePreset;
  surfaceCustom: string;
  availabilityNotes: string;
} {
  const meta =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};

  const presetParsed = venueSurfacePresetSchema.safeParse(meta.surfacePreset);
  if (presetParsed.success) {
    const preset = presetParsed.data;
    const customFromMeta =
      typeof meta.surfaceCustom === "string" ? meta.surfaceCustom : "";
    const typeFallback =
      typeof meta.surfaceType === "string" ? meta.surfaceType : "";
    return {
      surfacePreset: preset,
      surfaceCustom:
        preset === "other"
          ? customFromMeta || typeFallback
          : customFromMeta,
      availabilityNotes:
        typeof meta.availabilityNotes === "string" ? meta.availabilityNotes : "",
    };
  }

  const surfaceType = typeof meta.surfaceType === "string" ? meta.surfaceType : "";
  return {
    surfacePreset: "other",
    surfaceCustom: surfaceType,
    availabilityNotes:
      typeof meta.availabilityNotes === "string" ? meta.availabilityNotes : "",
  };
}
