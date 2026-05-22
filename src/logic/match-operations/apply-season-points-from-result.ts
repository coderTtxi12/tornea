import { and, eq, sql } from "drizzle-orm";

import type { Db } from "@/db/client";
import { seasonTeams } from "@/db/schema";

const WALKOVER_GOALS_FOR = 3;
const WALKOVER_GOALS_AGAINST = 0;

export type FinishOutcome =
  | { kind: "played"; homeScore: number; awayScore: number }
  | { kind: "walkover"; winnerTeamId: string; loserTeamId: string }
  | { kind: "both_no_show" };

export async function applySeasonPointsFromResult(
  db: Db,
  seasonId: string,
  homeTeamId: string,
  awayTeamId: string,
  outcome: FinishOutcome,
): Promise<void> {
  const bump = async (
    teamId: string,
    delta: {
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      points: number;
    },
  ) => {
    await db
      .update(seasonTeams)
      .set({
        played: sql`${seasonTeams.played} + ${delta.played}`,
        won: sql`${seasonTeams.won} + ${delta.won}`,
        drawn: sql`${seasonTeams.drawn} + ${delta.drawn}`,
        lost: sql`${seasonTeams.lost} + ${delta.lost}`,
        goalsFor: sql`${seasonTeams.goalsFor} + ${delta.goalsFor}`,
        goalsAgainst: sql`${seasonTeams.goalsAgainst} + ${delta.goalsAgainst}`,
        points: sql`${seasonTeams.points} + ${delta.points}`,
        updatedAt: new Date(),
      })
      .where(and(eq(seasonTeams.seasonId, seasonId), eq(seasonTeams.teamId, teamId)));
  };

  if (outcome.kind === "both_no_show") {
    await bump(homeTeamId, {
      played: 1,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
    await bump(awayTeamId, {
      played: 1,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
    return;
  }

  if (outcome.kind === "walkover") {
    await bump(outcome.winnerTeamId, {
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalsFor: WALKOVER_GOALS_FOR,
      goalsAgainst: WALKOVER_GOALS_AGAINST,
      points: 3,
    });
    await bump(outcome.loserTeamId, {
      played: 1,
      won: 0,
      drawn: 0,
      lost: 1,
      goalsFor: WALKOVER_GOALS_AGAINST,
      goalsAgainst: WALKOVER_GOALS_FOR,
      points: 0,
    });
    return;
  }

  const { homeScore, awayScore } = outcome;
  if (homeScore > awayScore) {
    await bump(homeTeamId, {
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalsFor: homeScore,
      goalsAgainst: awayScore,
      points: 3,
    });
    await bump(awayTeamId, {
      played: 1,
      won: 0,
      drawn: 0,
      lost: 1,
      goalsFor: awayScore,
      goalsAgainst: homeScore,
      points: 0,
    });
  } else if (awayScore > homeScore) {
    await bump(awayTeamId, {
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalsFor: awayScore,
      goalsAgainst: homeScore,
      points: 3,
    });
    await bump(homeTeamId, {
      played: 1,
      won: 0,
      drawn: 0,
      lost: 1,
      goalsFor: homeScore,
      goalsAgainst: awayScore,
      points: 0,
    });
  } else {
    await bump(homeTeamId, {
      played: 1,
      won: 0,
      drawn: 1,
      lost: 0,
      goalsFor: homeScore,
      goalsAgainst: awayScore,
      points: 1,
    });
    await bump(awayTeamId, {
      played: 1,
      won: 0,
      drawn: 1,
      lost: 0,
      goalsFor: awayScore,
      goalsAgainst: homeScore,
      points: 1,
    });
  }
}
