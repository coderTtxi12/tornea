import { getDb } from "@/db/client";
import { matchGoals } from "@/db/schema";

import { assertMatchLiveForIncidents } from "./assert-match-live";
import {
  isPlayerExpelled,
  lineupPlayerIdsForTeam,
} from "./match-player-state";
import { getMatchOperationsBundle } from "./get-match-operations-bundle";

export type RecordMatchGoalInput = {
  actorUserId: string;
  leagueId: string;
  matchId: string;
  teamId: string;
  scorerPlayerId?: string | null;
  assistPlayerId?: string | null;
  period: "first_half" | "second_half";
  minute: number;
  isOwnGoal?: boolean;
  goalKind?: "open_play" | "penalty_kick" | "direct_free_kick" | "other";
};

export type RecordMatchGoalResult =
  | { ok: true; goalId: string }
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

export async function recordMatchGoal(
  input: RecordMatchGoalInput,
): Promise<RecordMatchGoalResult> {
  const live = await assertMatchLiveForIncidents(
    input.actorUserId,
    input.leagueId,
    input.matchId,
  );
  if (!live.ok) return live;

  if (
    input.teamId !== live.homeTeamId &&
    input.teamId !== live.awayTeamId
  ) {
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

  const cards = bundle.bundle.cards.map((c) => ({
    teamId: c.teamId,
    playerId: c.playerId,
    cardKind: c.cardKind as "yellow" | "red" | "second_yellow",
  }));

  if (input.scorerPlayerId) {
    if (!lineupIds.has(input.scorerPlayerId)) {
      return { ok: false, reason: "player_not_in_lineup" };
    }
    if (isPlayerExpelled(input.teamId, input.scorerPlayerId, cards)) {
      return { ok: false, reason: "player_expelled" };
    }
  }
  if (input.assistPlayerId) {
    if (!lineupIds.has(input.assistPlayerId)) {
      return { ok: false, reason: "player_not_in_lineup" };
    }
    if (isPlayerExpelled(input.teamId, input.assistPlayerId, cards)) {
      return { ok: false, reason: "player_expelled" };
    }
  }

  const db = getDb();
  const [row] = await db
    .insert(matchGoals)
    .values({
      matchId: input.matchId,
      teamId: input.teamId,
      scorerPlayerId: input.scorerPlayerId ?? null,
      assistPlayerId: input.assistPlayerId ?? null,
      period: input.period,
      minute: input.minute,
      isOwnGoal: input.isOwnGoal ?? false,
      goalKind: input.goalKind ?? "open_play",
    })
    .returning({ id: matchGoals.id });

  return { ok: true, goalId: row!.id };
}
