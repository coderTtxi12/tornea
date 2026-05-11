import { z } from "zod";
import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { dashboardAccessRequests } from "@/db/schema";

import { normalizeWhatsappForStorage } from "./whatsapp";

export const accessRequestFormSchema = z.object({
  contactFullName: z.string().trim().min(1).max(200),
  whatsappNumber: z.string().trim().min(8).max(40),
  leaguesManagedCount: z.coerce.number().int().min(0).max(50_000),
  tournamentsSummary: z.string().trim().max(8000),
  organizationName: z.string().trim().max(200).optional().nullable(),
  cityOrRegion: z.string().trim().max(200).optional().nullable(),
  referralSource: z.string().trim().max(200).optional().nullable(),
  approximatePlayersCount: z.coerce
    .number()
    .int()
    .min(0)
    .max(5_000_000)
    .optional()
    .nullable(),
  extraNotes: z.string().trim().max(8000).optional().nullable(),
});

export type AccessRequestFormInput = z.infer<typeof accessRequestFormSchema>;

export async function insertDashboardAccessRequest(params: {
  userId: string;
  data: AccessRequestFormInput;
}): Promise<{ id: string }> {
  const normalizedWhatsapp = normalizeWhatsappForStorage(
    params.data.whatsappNumber,
  );
  if (normalizedWhatsapp.length < 10) {
    throw new Error("Invalid WhatsApp number");
  }

  const db = getDb();
  const [row] = await db
    .insert(dashboardAccessRequests)
    .values({
      userId: params.userId,
      contactFullName: params.data.contactFullName,
      whatsappNumber: normalizedWhatsapp,
      leaguesManagedCount: params.data.leaguesManagedCount,
      tournamentsSummary: params.data.tournamentsSummary,
      organizationName: params.data.organizationName ?? null,
      cityOrRegion: params.data.cityOrRegion ?? null,
      referralSource: params.data.referralSource ?? null,
      approximatePlayersCount: params.data.approximatePlayersCount ?? null,
      extraNotes: params.data.extraNotes ?? null,
    })
    .returning({ id: dashboardAccessRequests.id });

  if (!row) {
    throw new Error("Failed to save access request");
  }

  return row;
}

export async function userHasAnyDashboardAccessRequest(
  userId: string,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: dashboardAccessRequests.id })
    .from(dashboardAccessRequests)
    .where(eq(dashboardAccessRequests.userId, userId))
    .limit(1);
  return row != null;
}
