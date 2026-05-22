import { getDb } from "@/db/client";
import { matchGoals, matchPenaltyAttempts } from "@/db/schema";

import { assertMatchLiveForIncidents } from "./assert-match-live";
import { getMatchOperationsBundle } from "./get-match-operations-bundle";
import {
  isPlayerExpelled,
  lineupPlayerIdsForTeam,
} from "./match-player-state";

export type RecordMatchPenaltyInput = {
  actorUserId: string;
  leagueId: string;
  matchId: string;
  teamId: string;
  takerId: string;
  outcome: "scored" | "saved" | "missed" | "off_target";
  period: "first_half" | "second_half";
  minute: number;
};

export type RecordMatchPenaltyResult =
  | { ok: true; penaltyId: string; goalId: string | null }
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

export async function recordMatchPenalty(
  input: RecordMatchPenaltyInput,
): Promise<RecordMatchPenaltyResult> {
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
  if (!lineupIds.has(input.takerId)) {
    return { ok: false, reason: "player_not_in_lineup" };
  }

  const cards = bundle.bundle.cards.map((c) => ({
    teamId: c.teamId,
    playerId: c.playerId,
    cardKind: c.cardKind as "yellow" | "red" | "second_yellow",
  }));
  if (isPlayerExpelled(input.teamId, input.takerId, cards)) {
    return { ok: false, reason: "player_expelled" };
  }

  const db = getDb();
  let goalId: string | null = null;

  if (input.outcome === "scored") {
    const [goal] = await db
      .insert(matchGoals)
      .values({
        matchId: input.matchId,
        teamId: input.teamId,
        scorerPlayerId: input.takerId,
        period: input.period,
        minute: input.minute,
        goalKind: "penalty_kick",
        isOwnGoal: false,
      })
      .returning({ id: matchGoals.id });
    goalId = goal!.id;
  }

  const [pen] = await db
    .insert(matchPenaltyAttempts)
    .values({
      matchId: input.matchId,
      teamId: input.teamId,
      takerId: input.takerId,
      outcome: input.outcome,
      period: input.period,
      minute: input.minute,
      matchGoalId: goalId,
    })
    .returning({ id: matchPenaltyAttempts.id });

  return { ok: true, penaltyId: pen!.id, goalId };
}
