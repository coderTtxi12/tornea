import { z } from "zod";

export const footballPeriodSchema = z.enum(["first_half", "second_half"]);

export const validateSetupSchema = z.object({
  playersOnFieldPerTeam: z.number().int().min(1).max(30),
  firstHalfMinutes: z.number().int().min(1).max(120),
  halftimeBreakMinutes: z.number().int().min(0).max(60),
  secondHalfMinutes: z.number().int().min(1).max(120),
});

export const lineupsSchema = z.object({
  entries: z
    .array(
      z.object({
        teamId: z.string().uuid(),
        playerId: z.string().uuid(),
        slot: z.enum(["starter", "bench"]),
      }),
    )
    .min(2),
});

export const clockSchema = z.object({
  action: z.enum(["pause", "resume", "end_period"]),
});

export const goalSchema = z.object({
  teamId: z.string().uuid(),
  scorerPlayerId: z.string().uuid().optional().nullable(),
  assistPlayerId: z.string().uuid().optional().nullable(),
  period: footballPeriodSchema,
  minute: z.number().int().min(0).max(130),
  isOwnGoal: z.boolean().optional(),
  goalKind: z
    .enum(["open_play", "penalty_kick", "direct_free_kick", "other"])
    .optional(),
});

export const cardSchema = z.object({
  teamId: z.string().uuid(),
  playerId: z.string().uuid(),
  cardKind: z.enum(["yellow", "red"]),
  period: footballPeriodSchema,
  minute: z.number().int().min(0).max(130),
});

export const substitutionSchema = z.object({
  teamId: z.string().uuid(),
  playerOutId: z.string().uuid(),
  playerInId: z.string().uuid(),
  period: footballPeriodSchema,
  minute: z.number().int().min(0).max(130),
});

export const foulSchema = z.object({
  offendingTeamId: z.string().uuid(),
  offendingPlayerId: z.string().uuid(),
  period: footballPeriodSchema,
  minute: z.number().int().min(0).max(130),
  foulKind: z
    .enum(["careless_foul", "reckless_tackle", "other"])
    .optional(),
});

export const penaltySchema = z.object({
  teamId: z.string().uuid(),
  takerId: z.string().uuid(),
  outcome: z.enum(["scored", "saved", "missed", "off_target"]),
  period: footballPeriodSchema,
  minute: z.number().int().min(0).max(130),
});

export const finishSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("played"),
    homeScore: z.number().int().min(0).max(99),
    awayScore: z.number().int().min(0).max(99),
    notes: z.string().max(2000).optional().nullable(),
  }),
  z.object({
    type: z.literal("walkover_home"),
    notes: z.string().max(2000).optional().nullable(),
  }),
  z.object({
    type: z.literal("walkover_away"),
    notes: z.string().max(2000).optional().nullable(),
  }),
  z.object({
    type: z.literal("both_no_show"),
    notes: z.string().max(2000).optional().nullable(),
  }),
]);
