import { z } from "zod";

const uuid = z.string().uuid();

export const newMatchJsonSchema = z
  .object({
    seasonId: uuid,
    homeTeamId: uuid,
    awayTeamId: uuid,
    /** ISO 8601 o valor parseable por `Date`. */
    scheduledAt: z.string().trim().min(1, "Indica la fecha y hora del partido."),
    /** Fase del torneo → `matches.round_label` (texto libre o atajo desde el formulario). */
    roundLabel: z.union([z.string().trim().max(120), z.null()]).optional(),
    venueId: z.union([uuid, z.null()]).optional(),
    leagueCategoryId: z.union([uuid, z.null()]).optional(),
    notes: z.union([z.string().trim().max(2000), z.null()]).optional(),
  })
  .superRefine((data, ctx) => {
    const t = Date.parse(data.scheduledAt);
    if (Number.isNaN(t)) {
      ctx.addIssue({
        code: "custom",
        message: "La fecha u hora no es válida.",
        path: ["scheduledAt"],
      });
    }
    if (data.homeTeamId === data.awayTeamId) {
      ctx.addIssue({
        code: "custom",
        message: "Local y visitante deben ser equipos distintos.",
        path: ["awayTeamId"],
      });
    }
  });

export type NewMatchJson = z.infer<typeof newMatchJsonSchema>;
