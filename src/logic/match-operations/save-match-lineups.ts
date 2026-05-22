import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { matchLineups, matches, teamRosters } from "@/db/schema";

import { readMatchReportMetadata } from "@/logic/leagues/match-report-metadata";

import { loadMatchForOperations } from "./match-operations-access";
import {
  countStarters,
  lineupPlayerIdsForTeam,
} from "./match-player-state";
import {
  mergeMatchOperationsIntoReport,
  readMatchOperationsMetadata,
} from "./match-operations-metadata";

export type LineupEntry = {
  teamId: string;
  playerId: string;
  slot: "starter" | "bench";
};

export type SaveMatchLineupsInput = {
  actorUserId: string;
  leagueId: string;
  matchId: string;
  entries: LineupEntry[];
};

export type SaveMatchLineupsResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "forbidden"
        | "not_found"
        | "invalid_phase"
        | "player_not_on_roster"
        | "player_both_teams"
        | "too_many_starters"
        | "missing_starters"
        | "wrong_starter_count";
    };

export async function saveMatchLineups(
  input: SaveMatchLineupsInput,
): Promise<SaveMatchLineupsResult> {
  const loaded = await loadMatchForOperations(
    input.actorUserId,
    input.leagueId,
    input.matchId,
  );
  if (!loaded.ok) return loaded;

  const { ctx } = loaded;
  const ops = readMatchOperationsMetadata(ctx.report);
  if (ops.operationsPhase !== "lineups" && ops.operationsPhase !== "ready") {
    if (ops.setupValidatedAt == null) {
      return { ok: false, reason: "invalid_phase" };
    }
  }

  const reportMeta = readMatchReportMetadata(ctx.report);
  const maxOnField = reportMeta.playersOnFieldPerTeam;
  if (maxOnField == null || maxOnField < 1) {
    return { ok: false, reason: "invalid_phase" };
  }

  const playerTeams = new Map<string, string>();
  for (const e of input.entries) {
    const prev = playerTeams.get(e.playerId);
    if (prev && prev !== e.teamId) {
      return { ok: false, reason: "player_both_teams" };
    }
    playerTeams.set(e.playerId, e.teamId);
    if (e.teamId !== ctx.homeTeamId && e.teamId !== ctx.awayTeamId) {
      return { ok: false, reason: "player_not_on_roster" };
    }
  }

  const db = getDb();
  const rosterRows = await db
    .select({ teamId: teamRosters.teamId, playerId: teamRosters.playerId })
    .from(teamRosters)
    .where(
      and(
        eq(teamRosters.seasonId, ctx.seasonId),
        inArray(teamRosters.teamId, [ctx.homeTeamId, ctx.awayTeamId]),
      ),
    );

  const rosterSet = new Set(
    rosterRows.map((r) => `${r.teamId}:${r.playerId}`),
  );
  for (const e of input.entries) {
    if (!rosterSet.has(`${e.teamId}:${e.playerId}`)) {
      return { ok: false, reason: "player_not_on_roster" };
    }
  }

  const lineupsForCount = input.entries.map((e) => ({
    teamId: e.teamId,
    playerId: e.playerId,
    slot: e.slot,
  }));

  const homeStarterCount = countStarters(lineupsForCount, ctx.homeTeamId);
  const awayStarterCount = countStarters(lineupsForCount, ctx.awayTeamId);
  if (homeStarterCount > maxOnField || awayStarterCount > maxOnField) {
    return { ok: false, reason: "too_many_starters" };
  }
  if (homeStarterCount < 1 || awayStarterCount < 1) {
    return { ok: false, reason: "missing_starters" };
  }
  if (homeStarterCount !== maxOnField || awayStarterCount !== maxOnField) {
    return { ok: false, reason: "wrong_starter_count" };
  }

  const homeIds = lineupPlayerIdsForTeam(lineupsForCount, ctx.homeTeamId);
  const awayIds = lineupPlayerIdsForTeam(lineupsForCount, ctx.awayTeamId);
  for (const id of homeIds) {
    if (awayIds.has(id)) return { ok: false, reason: "player_both_teams" };
  }

  await db.transaction(async (tx) => {
    await tx.delete(matchLineups).where(eq(matchLineups.matchId, input.matchId));
    if (input.entries.length > 0) {
      await tx.insert(matchLineups).values(
        input.entries.map((e, i) => ({
          matchId: input.matchId,
          teamId: e.teamId,
          playerId: e.playerId,
          slot: e.slot,
          sortOrder: i,
        })),
      );
    }

    const reportWithOps = mergeMatchOperationsIntoReport(ctx.report, {
      operationsPhase: "ready",
      lineupsValidatedAt: new Date().toISOString(),
    });
    await tx
      .update(matches)
      .set({ report: reportWithOps, updatedAt: new Date() })
      .where(eq(matches.id, input.matchId));
  });

  return { ok: true };
}
