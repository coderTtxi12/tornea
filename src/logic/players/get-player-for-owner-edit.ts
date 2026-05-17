import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagues, players, seasons, teamRosters, teams } from "@/db/schema";

import { userCanManageLeague } from "@/logic/leagues/league-dashboard-admin";
import { pickTargetSeasonIdFromCandidates, type SeasonPickRow } from "@/logic/leagues/season-pick";

export type PlayerEditPayload = {
  player: {
    id: string;
    leagueId: string;
    fullName: string;
    /** CURP en `players.doc_id`. */
    docId: string | null;
    /** `YYYY-MM-DD` */
    birthDate: string;
    metadata: unknown;
  };
  roster: {
    id: string;
    teamId: string;
    seasonId: string;
    shirtNumber: number | null;
    position: string | null;
  };
};

export async function getPlayerForOwnerEdit(
  ownerUserId: string,
  leagueId: string,
  teamId: string,
  playerId: string,
): Promise<PlayerEditPayload | "FORBIDDEN" | "NOT_FOUND"> {
  const db = getDb();

  const [leagueRow] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!leagueRow) {
    return "NOT_FOUND";
  }
  if (!(await userCanManageLeague(db, leagueId, ownerUserId))) {
    return "FORBIDDEN";
  }

  const [team] = await db
    .select({ id: teams.id, leagueId: teams.leagueId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team || team.leagueId !== leagueId) {
    return "NOT_FOUND";
  }

  const seasonRows = await db
    .select({
      id: seasons.id,
      status: seasons.status,
      startsOn: seasons.startsOn,
    })
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));

  const seasonCandidates: SeasonPickRow[] = seasonRows.map((s) => ({
    id: s.id,
    status: s.status,
    startsOn: s.startsOn,
  }));
  const targetSeasonId = pickTargetSeasonIdFromCandidates(seasonCandidates);
  if (!targetSeasonId) {
    return "NOT_FOUND";
  }

  const [row] = await db
    .select({
      playerId: players.id,
      leagueId: players.leagueId,
      fullName: players.fullName,
      docId: players.docId,
      birthDate: players.birthDate,
      metadata: players.metadata,
      rosterId: teamRosters.id,
      teamId: teamRosters.teamId,
      seasonId: teamRosters.seasonId,
      shirtNumber: teamRosters.shirtNumber,
      position: teamRosters.position,
    })
    .from(teamRosters)
    .innerJoin(players, eq(teamRosters.playerId, players.id))
    .where(
      and(
        eq(teamRosters.seasonId, targetSeasonId),
        eq(teamRosters.teamId, teamId),
        eq(players.id, playerId),
        eq(players.leagueId, leagueId),
      ),
    )
    .limit(1);

  if (!row) {
    return "NOT_FOUND";
  }

  const rawBirth = row.birthDate as string | Date | null | undefined;
  const birth =
    rawBirth == null
      ? ""
      : typeof rawBirth === "string"
        ? rawBirth.slice(0, 10)
        : rawBirth instanceof Date
          ? rawBirth.toISOString().slice(0, 10)
          : String(rawBirth).slice(0, 10);

  return {
    player: {
      id: row.playerId,
      leagueId: row.leagueId,
      fullName: row.fullName,
      docId: row.docId?.trim() ? row.docId.trim() : null,
      birthDate: birth,
      metadata: row.metadata,
    },
    roster: {
      id: row.rosterId,
      teamId: row.teamId,
      seasonId: row.seasonId,
      shirtNumber: row.shirtNumber,
      position: row.position,
    },
  };
}
