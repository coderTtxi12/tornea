import { loadMatchForOperations } from "./match-operations-access";
import { readMatchOperationsMetadata } from "./match-operations-metadata";

export type AssertLiveResult =
  | { ok: true; matchId: string; homeTeamId: string; awayTeamId: string; seasonId: string }
  | { ok: false; reason: "forbidden" | "not_found" | "not_live" };

export async function assertMatchLiveForIncidents(
  actorUserId: string,
  leagueId: string,
  matchId: string,
): Promise<AssertLiveResult> {
  const loaded = await loadMatchForOperations(actorUserId, leagueId, matchId);
  if (!loaded.ok) return loaded;
  const { ctx } = loaded;
  if (ctx.status !== "live") return { ok: false, reason: "not_live" };
  const ops = readMatchOperationsMetadata(ctx.report);
  if (ops.operationsPhase !== "live") return { ok: false, reason: "not_live" };
  return {
    ok: true,
    matchId: ctx.matchId,
    homeTeamId: ctx.homeTeamId,
    awayTeamId: ctx.awayTeamId,
    seasonId: ctx.seasonId,
  };
}
