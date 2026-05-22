import { getDb } from "@/db/client";
import { matchCards } from "@/db/schema";

import { assertMatchLiveForIncidents } from "./assert-match-live";
import { getMatchOperationsBundle } from "./get-match-operations-bundle";
import {
  isPlayerExpelled,
  lineupPlayerIdsForTeam,
} from "./match-player-state";

export type RecordMatchCardInput = {
  actorUserId: string;
  leagueId: string;
  matchId: string;
  teamId: string;
  playerId: string;
  cardKind: "yellow" | "red";
  period: "first_half" | "second_half";
  minute: number;
};

export type RecordMatchCardResult =
  | { ok: true; cardId: string; effectiveKind: "yellow" | "red" | "second_yellow" }
  | {
      ok: false;
      reason:
        | "forbidden"
        | "not_found"
        | "not_live"
        | "bad_team"
        | "player_not_in_lineup"
        | "player_expelled";
    };

export async function recordMatchCard(
  input: RecordMatchCardInput,
): Promise<RecordMatchCardResult> {
  const live = await assertMatchLiveForIncidents(
    input.actorUserId,
    input.leagueId,
    input.matchId,
  );
  if (!live.ok) return live;

  if (input.teamId !== live.homeTeamId && input.teamId !== live.awayTeamId) {
    return { ok: false, reason: "bad_team" };
  }

  const bundle = await getMatchOperationsBundle(
    input.actorUserId,
    input.leagueId,
    input.matchId,
  );
  if (!bundle.ok) return { ok: false, reason: "not_found" };

  const lineupIds = lineupPlayerIdsForTeam(
    bundle.bundle.lineups.map((l) => ({
      teamId: l.teamId,
      playerId: l.playerId,
      slot: l.slot,
    })),
    input.teamId,
  );
  if (!lineupIds.has(input.playerId)) {
    return { ok: false, reason: "player_not_in_lineup" };
  }

  const priorCards = bundle.bundle.cards
    .filter((c) => c.playerId === input.playerId && c.teamId === input.teamId)
    .map((c) => ({
      teamId: c.teamId,
      playerId: c.playerId,
      cardKind: c.cardKind as "yellow" | "red" | "second_yellow",
    }));

  if (isPlayerExpelled(input.teamId, input.playerId, priorCards)) {
    return { ok: false, reason: "player_expelled" };
  }

  let effectiveKind: "yellow" | "red" | "second_yellow" =
    input.cardKind === "red" ? "red" : "yellow";
  if (input.cardKind === "yellow") {
    const yellowCount = priorCards.filter((c) => c.cardKind === "yellow").length;
    if (yellowCount >= 1) effectiveKind = "second_yellow";
  }

  const db = getDb();
  const [row] = await db
    .insert(matchCards)
    .values({
      matchId: input.matchId,
      teamId: input.teamId,
      playerId: input.playerId,
      cardKind: effectiveKind,
      period: input.period,
      minute: input.minute,
      recordedByUserId: input.actorUserId,
    })
    .returning({ id: matchCards.id });

  return { ok: true, cardId: row!.id, effectiveKind };
}
