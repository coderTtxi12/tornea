import { getDb } from "@/db/client";
import { matchFouls } from "@/db/schema";

import { assertMatchLiveForIncidents } from "./assert-match-live";
import { countTeamFouls } from "./match-player-state";
import { getMatchOperationsBundle } from "./get-match-operations-bundle";

export type RecordMatchFoulInput = {
  actorUserId: string;
  leagueId: string;
  matchId: string;
  offendingTeamId: string;
  offendingPlayerId: string;
  period: "first_half" | "second_half";
  minute: number;
  foulKind?: "careless_foul" | "reckless_tackle" | "other";
};

export type RecordMatchFoulResult =
  | {
      ok: true;
      foulId: string;
      teamFoulCount: number;
      suggestDirectFreeKick: boolean;
    }
  | {
      ok: false;
      reason:
        | "forbidden"
        | "not_found"
        | "not_live"
        | "bad_team"
        | "player_not_in_lineup";
    };

export async function recordMatchFoul(
  input: RecordMatchFoulInput,
): Promise<RecordMatchFoulResult> {
  const live = await assertMatchLiveForIncidents(
    input.actorUserId,
    input.leagueId,
    input.matchId,
  );
  if (!live.ok) return live;

  if (
    input.offendingTeamId !== live.homeTeamId &&
    input.offendingTeamId !== live.awayTeamId
  ) {
    return { ok: false, reason: "bad_team" };
  }

  const bundle = await getMatchOperationsBundle(
    input.actorUserId,
    input.leagueId,
    input.matchId,
  );
  if (!bundle.ok) return { ok: false, reason: "not_found" };

  const inLineup = bundle.bundle.lineups.some(
    (l) =>
      l.teamId === input.offendingTeamId &&
      l.playerId === input.offendingPlayerId,
  );
  if (!inLineup) return { ok: false, reason: "player_not_in_lineup" };

  const db = getDb();
  const [row] = await db
    .insert(matchFouls)
    .values({
      matchId: input.matchId,
      offendingTeamId: input.offendingTeamId,
      offendingPlayerId: input.offendingPlayerId,
      foulKind: input.foulKind ?? "careless_foul",
      period: input.period,
      minute: input.minute,
      recordedByUserId: input.actorUserId,
    })
    .returning({ id: matchFouls.id });

  const prior = bundle.bundle.fouls.map((f) => ({
    offendingTeamId: f.offendingTeamId,
  }));
  prior.push({ offendingTeamId: input.offendingTeamId });
  const teamFoulCount = countTeamFouls(prior, input.offendingTeamId);

  return {
    ok: true,
    foulId: row!.id,
    teamFoulCount,
    suggestDirectFreeKick: teamFoulCount >= 5,
  };
}
