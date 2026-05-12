import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagues } from "@/db/schema";

/**
 * Borra una liga. FK en cascada elimina `league_members`, `league_create_idempotency`, etc.
 * Usado para compensar fallos posteriores al insert (p. ej. Storage).
 */
export async function deleteLeagueById(leagueId: string): Promise<void> {
  const db = getDb();
  await db.delete(leagues).where(eq(leagues.id, leagueId));
}
