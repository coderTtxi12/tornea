import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db/client";
import { matches, seasons, teams } from "@/db/schema";

import { userCanManageLeague } from "@/logic/leagues/league-dashboard-admin";

export type MatchOperationsContext = {
  matchId: string;
  leagueId: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  report: unknown;
  regulationMinutes: number | null;
  matchday: number | null;
  roundLabel: string | null;
  venueId: string | null;
  leagueRefereeId: string | null;
  leagueCategoryId: string | null;
  scheduledAt: Date;
};

export type LoadMatchForOperationsResult =
  | { ok: true; ctx: MatchOperationsContext; homeName: string; awayName: string }
  | { ok: false; reason: "forbidden" | "not_found" };

export async function loadMatchForOperations(
  actorUserId: string,
  leagueId: string,
  matchId: string,
): Promise<LoadMatchForOperationsResult> {
  const db = getDb();
  if (!(await userCanManageLeague(db, leagueId, actorUserId))) {
    return { ok: false, reason: "forbidden" };
  }

  const homeT = alias(teams, "home_team");
  const awayT = alias(teams, "away_team");

  const [row] = await db
    .select({
      matchId: matches.id,
      seasonId: matches.seasonId,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      startedAt: matches.startedAt,
      endedAt: matches.endedAt,
      report: matches.report,
      regulationMinutes: matches.regulationMinutes,
      matchday: matches.matchday,
      roundLabel: matches.roundLabel,
      venueId: matches.venueId,
      leagueRefereeId: matches.leagueRefereeId,
      leagueCategoryId: matches.leagueCategoryId,
      scheduledAt: matches.scheduledAt,
      leagueId: seasons.leagueId,
      homeName: homeT.name,
      awayName: awayT.name,
    })
    .from(matches)
    .innerJoin(seasons, eq(matches.seasonId, seasons.id))
    .innerJoin(homeT, eq(matches.homeTeamId, homeT.id))
    .innerJoin(awayT, eq(matches.awayTeamId, awayT.id))
    .where(and(eq(matches.id, matchId), eq(seasons.leagueId, leagueId)))
    .limit(1);

  if (!row) {
    return { ok: false, reason: "not_found" };
  }

  return {
    ok: true,
    homeName: row.homeName,
    awayName: row.awayName,
    ctx: {
      matchId: row.matchId,
      leagueId: row.leagueId,
      seasonId: row.seasonId,
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      status: row.status,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      report: row.report,
      regulationMinutes: row.regulationMinutes,
      matchday: row.matchday,
      roundLabel: row.roundLabel,
      venueId: row.venueId,
      leagueRefereeId: row.leagueRefereeId,
      leagueCategoryId: row.leagueCategoryId,
      scheduledAt: row.scheduledAt,
    },
  };
}
