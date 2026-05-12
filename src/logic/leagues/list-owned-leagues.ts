import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagues } from "@/db/schema";

export type OwnedLeagueSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

/**
 * Ligas donde el usuario es dueño (`leagues.owner_user_id`).
 * Usado para onboarding: “¿tiene al menos una liga?”.
 */
export async function listOwnedLeaguesForAppUserId(
  appUserId: string,
): Promise<OwnedLeagueSummary[]> {
  const db = getDb();
  return db
    .select({
      id: leagues.id,
      name: leagues.name,
      slug: leagues.slug,
      status: leagues.status,
    })
    .from(leagues)
    .where(eq(leagues.ownerUserId, appUserId))
    .orderBy(asc(leagues.createdAt));
}
