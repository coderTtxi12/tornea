import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { players, teamRosters } from "@/db/schema";

import { getPlayerForOwnerEdit } from "./get-player-for-owner-edit";

export type UpdatePlayerForOwnerArgs = {
  ownerUserId: string;
  leagueId: string;
  teamId: string;
  playerId: string;
  fullName: string;
  birthDate: string;
  shirtNumber: number | null;
  position: string | null;
  whatsappE164: string | null;
  /** CURP en `players.doc_id`; `null` borra el valor guardado. */
  docId: string | null;
};

/**
 * Actualiza `players` y la fila de `team_rosters` de la temporada objetivo.
 * Preserva el resto de `metadata` (foto, CURP, etc.).
 */
export async function updatePlayerForOwner(
  args: UpdatePlayerForOwnerArgs,
): Promise<void | "FORBIDDEN" | "NOT_FOUND"> {
  const current = await getPlayerForOwnerEdit(
    args.ownerUserId,
    args.leagueId,
    args.teamId,
    args.playerId,
  );
  if (current === "FORBIDDEN" || current === "NOT_FOUND") {
    return current;
  }

  const db = getDb();

  await db.transaction(async (tx) => {
    const [prow] = await tx
      .select({ metadata: players.metadata })
      .from(players)
      .where(eq(players.id, args.playerId))
      .limit(1);
    if (!prow) {
      throw new Error("Player missing in transaction.");
    }
    const prev =
      prow.metadata && typeof prow.metadata === "object" && !Array.isArray(prow.metadata)
        ? (prow.metadata as Record<string, unknown>)
        : {};
    const nextMeta = { ...prev };
    if (args.whatsappE164) {
      nextMeta.whatsappE164 = args.whatsappE164;
    } else {
      delete nextMeta.whatsappE164;
    }

    await tx
      .update(players)
      .set({
        fullName: args.fullName.trim(),
        docId: args.docId,
        birthDate: args.birthDate,
        metadata: nextMeta,
        updatedAt: new Date(),
      })
      .where(and(eq(players.id, args.playerId), eq(players.leagueId, args.leagueId)));

    await tx
      .update(teamRosters)
      .set({
        shirtNumber: args.shirtNumber,
        position: args.position?.trim() || null,
      })
      .where(eq(teamRosters.id, current.roster.id));
  });
}
