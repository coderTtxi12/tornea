import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagues, venues } from "@/db/schema";

import { userCanManageLeague } from "./league-dashboard-admin";

/**
 * Inserta `venues` para una liga. Dueño o administrador del panel.
 */
export async function createVenueInLeague(args: {
  ownerUserId: string;
  leagueId: string;
  name: string;
  address: string;
  metadata: Record<string, unknown>;
}): Promise<{ venueId: string; leagueOwnerUserId: string }> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [leagueRow] = await tx
      .select({ id: leagues.id, ownerUserId: leagues.ownerUserId })
      .from(leagues)
      .where(eq(leagues.id, args.leagueId))
      .limit(1);

    if (!leagueRow) {
      throw new Error("NOT_FOUND");
    }
    if (!(await userCanManageLeague(tx, args.leagueId, args.ownerUserId))) {
      throw new Error("FORBIDDEN");
    }

    const existingSort = await tx
      .select({ sortOrder: venues.sortOrder })
      .from(venues)
      .where(eq(venues.leagueId, args.leagueId));

    const nextSort =
      existingSort.length === 0
        ? 0
        : Math.max(...existingSort.map((r) => r.sortOrder)) + 1;

    const [row] = await tx
      .insert(venues)
      .values({
        leagueId: args.leagueId,
        name: args.name.trim(),
        address: args.address.trim(),
        metadata: args.metadata,
        sortOrder: nextSort,
      })
      .returning({ id: venues.id });

    if (!row) {
      throw new Error("No se pudo crear la cancha.");
    }

    return { venueId: row.id, leagueOwnerUserId: leagueRow.ownerUserId };
  });
}
