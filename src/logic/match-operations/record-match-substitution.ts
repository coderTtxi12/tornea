import { getDb } from "@/db/client";
import { matchSubstitutions } from "@/db/schema";

import { assertMatchLiveForIncidents } from "./assert-match-live";
import { getMatchOperationsBundle } from "./get-match-operations-bundle";
import {
  deriveOnFieldByTeam,
  isPlayerExpelled,
  lineupPlayerIdsForTeam,
} from "./match-player-state";

export type RecordMatchSubstitutionInput = {
  actorUserId: string;
  leagueId: string;
  matchId: string;
  teamId: string;
  playerOutId: string;
  playerInId: string;
  period: "first_half" | "second_half";
  minute: number;
};

export type RecordMatchSubstitutionResult =
  | { ok: true; substitutionId: string }
  | {
      ok: false;
      reason:
        | "forbidden"
        | "not_found"
        | "not_live"
        | "bad_team"
        | "same_player"
        | "out_not_on_field"
        | "in_not_in_lineup"
        | "player_expelled";
    };

export async function recordMatchSubstitution(
  input: RecordMatchSubstitutionInput,
): Promise<RecordMatchSubstitutionResult> {
  const live = await assertMatchLiveForIncidents(
    input.actorUserId,
    input.leagueId,
    input.matchId,
  );
  if (!live.ok) return live;

  if (input.playerOutId === input.playerInId) {
    return { ok: false, reason: "same_player" };
  }
  if (input.teamId !== live.homeTeamId && input.teamId !== live.awayTeamId) {
    return { ok: false, reason: "bad_team" };
  }

  const bundle = await getMatchOperationsBundle(
    input.actorUserId,
    input.leagueId,
    input.matchId,
  );
  if (!bundle.ok) return { ok: false, reason: "not_found" };

  const lineups = bundle.bundle.lineups.map((l) => ({
    teamId: l.teamId,
    playerId: l.playerId,
    slot: l.slot,
  }));
  const lineupIds = lineupPlayerIdsForTeam(lineups, input.teamId);
  if (!lineupIds.has(input.playerInId)) {
    return { ok: false, reason: "in_not_in_lineup" };
  }

  const cards = bundle.bundle.cards.map((c) => ({
    teamId: c.teamId,
    playerId: c.playerId,
    cardKind: c.cardKind as "yellow" | "red" | "second_yellow",
  }));
  if (isPlayerExpelled(input.teamId, input.playerInId, cards)) {
    return { ok: false, reason: "player_expelled" };
  }

  const onField = deriveOnFieldByTeam(
    lineups,
    bundle.bundle.substitutions.map((s) => ({
      teamId: s.teamId,
      playerOutId: s.playerOutId,
      playerInId: s.playerInId,
    })),
    cards,
  );
  const teamOnField = onField.get(input.teamId);
  if (!teamOnField?.has(input.playerOutId)) {
    return { ok: false, reason: "out_not_on_field" };
  }

  const db = getDb();
  const [row] = await db
    .insert(matchSubstitutions)
    .values({
      matchId: input.matchId,
      teamId: input.teamId,
      playerOutId: input.playerOutId,
      playerInId: input.playerInId,
      period: input.period,
      minute: input.minute,
    })
    .returning({ id: matchSubstitutions.id });

  return { ok: true, substitutionId: row!.id };
}
