import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  leagueCategories,
  leagueReferees,
  matchCards,
  matchFouls,
  matchGoals,
  matchLineups,
  matchPenaltyAttempts,
  matchSubstitutions,
  players,
  teamRosters,
  venues,
} from "@/db/schema";

import { readLeagueCategoryMetadata } from "@/logic/leagues/league-category-metadata";
import { readMatchReportMetadata } from "@/logic/leagues/match-report-metadata";

import { isMissingRelationError } from "@/lib/db/pg-error-code";

import { computeLiveScoreFromGoals } from "./compute-live-score";
import { loadMatchForOperations } from "./match-operations-access";
import { readMatchOperationsMetadata } from "./match-operations-metadata";
import {
  countTeamFouls,
  deriveOnFieldByTeam,
} from "./match-player-state";
import { safeMatchDetailQuery } from "./safe-query-match-detail";

export type MatchOperationsBundle = {
  match: {
    id: string;
    leagueId: string;
    seasonId: string;
    status: string;
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number | null;
    awayScore: number | null;
    scheduledAt: string;
    matchday: number | null;
    roundLabel: string | null;
    venueName: string | null;
    categoryName: string | null;
    refereeName: string | null;
    startedAt: string | null;
    endedAt: string | null;
  };
  report: ReturnType<typeof readMatchReportMetadata>;
  operations: ReturnType<typeof readMatchOperationsMetadata>;
  liveScore: { home: number; away: number };
  foulCounts: { home: number; away: number };
  lineups: Array<{
    id: string;
    teamId: string;
    playerId: string;
    playerName: string;
    slot: "starter" | "bench";
    shirtNumber: number | null;
  }>;
  rosterByTeam: Record<
    string,
    Array<{ playerId: string; playerName: string; shirtNumber: number | null }>
  >;
  goals: Array<{
    id: string;
    teamId: string;
    scorerPlayerId: string | null;
    scorerName: string | null;
    assistPlayerId: string | null;
    assistName: string | null;
    period: string | null;
    minute: number | null;
    isOwnGoal: boolean;
    goalKind: string | null;
  }>;
  cards: Array<{
    id: string;
    teamId: string;
    playerId: string | null;
    playerName: string | null;
    cardKind: string;
    period: string | null;
    minute: number | null;
  }>;
  substitutions: Array<{
    id: string;
    teamId: string;
    playerOutId: string;
    playerOutName: string;
    playerInId: string;
    playerInName: string;
    period: string | null;
    minute: number | null;
  }>;
  fouls: Array<{
    id: string;
    offendingTeamId: string;
    offendingPlayerId: string | null;
    offendingPlayerName: string | null;
    foulKind: string;
    period: string | null;
    minute: number | null;
  }>;
  penalties: Array<{
    id: string;
    teamId: string;
    takerId: string | null;
    takerName: string | null;
    outcome: string;
    period: string | null;
    minute: number | null;
  }>;
  onFieldPlayerIds: { home: string[]; away: string[] };
  /** Non-fatal: football detail tables missing until `npm run db:migrate`. */
  dbWarnings: string[];
};

export type GetMatchOperationsBundleResult =
  | { ok: true; bundle: MatchOperationsBundle }
  | { ok: false; reason: "forbidden" | "not_found" };

async function playerNameMap(
  db: ReturnType<typeof getDb>,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const rows = await db
    .select({ id: players.id, fullName: players.fullName })
    .from(players)
    .where(inArray(players.id, ids));
  for (const r of rows) map.set(r.id, r.fullName);
  return map;
}

export async function getMatchOperationsBundle(
  actorUserId: string,
  leagueId: string,
  matchId: string,
): Promise<GetMatchOperationsBundleResult> {
  const loaded = await loadMatchForOperations(actorUserId, leagueId, matchId);
  if (!loaded.ok) return loaded;

  const { ctx, homeName, awayName } = loaded;
  const db = getDb();
  const reportMeta = readMatchReportMetadata(ctx.report);
  const operations = readMatchOperationsMetadata(ctx.report);

  let categoryName: string | null = null;
  if (ctx.leagueCategoryId) {
    const [cat] = await db
      .select({ name: leagueCategories.name, metadata: leagueCategories.metadata })
      .from(leagueCategories)
      .where(eq(leagueCategories.id, ctx.leagueCategoryId))
      .limit(1);
    if (cat) {
      categoryName = cat.name;
      if (reportMeta.firstHalfMinutes == null) {
        const cm = readLeagueCategoryMetadata(cat.metadata);
        if (cm.firstHalfMinutes != null) reportMeta.firstHalfMinutes = cm.firstHalfMinutes;
        if (cm.halftimeBreakMinutes != null) {
          reportMeta.halftimeBreakMinutes = cm.halftimeBreakMinutes;
        }
        if (cm.secondHalfMinutes != null) reportMeta.secondHalfMinutes = cm.secondHalfMinutes;
      }
    }
  }

  let venueName: string | null = null;
  if (ctx.venueId) {
    const [v] = await db
      .select({ name: venues.name })
      .from(venues)
      .where(eq(venues.id, ctx.venueId))
      .limit(1);
    venueName = v?.name ?? null;
  }

  let refereeName: string | null = null;
  if (ctx.leagueRefereeId) {
    try {
      const [r] = await db
        .select({ fullName: leagueReferees.fullName })
        .from(leagueReferees)
        .where(eq(leagueReferees.id, ctx.leagueRefereeId))
        .limit(1);
      refereeName = r?.fullName ?? null;
    } catch (err) {
      if (!isMissingRelationError(err)) throw err;
    }
  }

  const dbWarnings: string[] = [];
  const schemaDriftTables: string[] = [];
  const noteSchemaDrift = (table: string) => {
    if (!schemaDriftTables.includes(table)) schemaDriftTables.push(table);
  };

  const lineupQ = await safeMatchDetailQuery(
    () =>
      db
        .select({
          id: matchLineups.id,
          teamId: matchLineups.teamId,
          playerId: matchLineups.playerId,
          slot: matchLineups.slot,
          shirtNumber: matchLineups.shirtNumber,
        })
        .from(matchLineups)
        .where(eq(matchLineups.matchId, matchId))
        .orderBy(asc(matchLineups.sortOrder), asc(matchLineups.id)),
    [],
  );
  if (lineupQ.schemaDrift) noteSchemaDrift("match_lineups");
  const lineupRows = lineupQ.data;

  const rosterRows = await db
    .select({
      teamId: teamRosters.teamId,
      playerId: teamRosters.playerId,
      shirtNumber: teamRosters.shirtNumber,
      fullName: players.fullName,
    })
    .from(teamRosters)
    .innerJoin(players, eq(teamRosters.playerId, players.id))
    .where(
      and(
        eq(teamRosters.seasonId, ctx.seasonId),
        inArray(teamRosters.teamId, [ctx.homeTeamId, ctx.awayTeamId]),
      ),
    );

  const goalQ = await safeMatchDetailQuery(
    () =>
      db
        .select()
        .from(matchGoals)
        .where(eq(matchGoals.matchId, matchId))
        .orderBy(asc(matchGoals.minute), asc(matchGoals.createdAt)),
    [],
  );
  if (goalQ.schemaDrift) noteSchemaDrift("match_goals");
  const goalRows = goalQ.data;

  const cardQ = await safeMatchDetailQuery(
    () =>
      db
        .select()
        .from(matchCards)
        .where(eq(matchCards.matchId, matchId))
        .orderBy(asc(matchCards.minute), asc(matchCards.createdAt)),
    [],
  );
  if (cardQ.schemaDrift) noteSchemaDrift("match_cards");
  const cardRows = cardQ.data;

  const subQ = await safeMatchDetailQuery(
    () =>
      db
        .select()
        .from(matchSubstitutions)
        .where(eq(matchSubstitutions.matchId, matchId))
        .orderBy(asc(matchSubstitutions.minute), asc(matchSubstitutions.createdAt)),
    [],
  );
  if (subQ.schemaDrift) noteSchemaDrift("match_substitutions");
  const subRows = subQ.data;

  const foulQ = await safeMatchDetailQuery(
    () =>
      db
        .select()
        .from(matchFouls)
        .where(eq(matchFouls.matchId, matchId))
        .orderBy(asc(matchFouls.minute), asc(matchFouls.createdAt)),
    [],
  );
  if (foulQ.schemaDrift) noteSchemaDrift("match_fouls");
  const foulRows = foulQ.data;

  const penQ = await safeMatchDetailQuery(
    () =>
      db
        .select()
        .from(matchPenaltyAttempts)
        .where(eq(matchPenaltyAttempts.matchId, matchId))
        .orderBy(asc(matchPenaltyAttempts.minute), asc(matchPenaltyAttempts.createdAt)),
    [],
  );
  if (penQ.schemaDrift) noteSchemaDrift("match_penalty_attempts");
  const penRows = penQ.data;

  const playerIds = new Set<string>();
  for (const l of lineupRows) playerIds.add(l.playerId);
  for (const r of rosterRows) playerIds.add(r.playerId);
  for (const g of goalRows) {
    if (g.scorerPlayerId) playerIds.add(g.scorerPlayerId);
    if (g.assistPlayerId) playerIds.add(g.assistPlayerId);
  }
  for (const c of cardRows) {
    if (c.playerId) playerIds.add(c.playerId);
  }
  for (const s of subRows) {
    playerIds.add(s.playerOutId);
    playerIds.add(s.playerInId);
  }
  for (const f of foulRows) {
    if (f.offendingPlayerId) playerIds.add(f.offendingPlayerId);
  }
  for (const p of penRows) {
    if (p.takerId) playerIds.add(p.takerId);
  }

  if (schemaDriftTables.length > 0) {
    dbWarnings.push(
      `Esquema de acta incompleto (${schemaDriftTables.join(", ")}). Ejecuta: npm run db:ensure:match-football-detail`,
    );
  }

  const names = await playerNameMap(db, [...playerIds]);

  const liveScore = computeLiveScoreFromGoals(
    goalRows.map((g) => ({
      teamId: g.teamId,
      isOwnGoal: g.isOwnGoal,
      homeTeamId: ctx.homeTeamId,
      awayTeamId: ctx.awayTeamId,
    })),
    ctx.homeTeamId,
    ctx.awayTeamId,
  );

  const onFieldMap = deriveOnFieldByTeam(
    lineupRows.map((l) => ({
      teamId: l.teamId,
      playerId: l.playerId,
      slot: l.slot,
    })),
    subRows.map((s) => ({
      teamId: s.teamId,
      playerOutId: s.playerOutId,
      playerInId: s.playerInId,
    })),
    cardRows.map((c) => ({
      teamId: c.teamId,
      playerId: c.playerId,
      cardKind: c.cardKind,
    })),
  );

  const rosterByTeam: MatchOperationsBundle["rosterByTeam"] = {
    [ctx.homeTeamId]: [],
    [ctx.awayTeamId]: [],
  };
  for (const r of rosterRows) {
    const list = rosterByTeam[r.teamId];
    if (!list) continue;
    list.push({
      playerId: r.playerId,
      playerName: r.fullName,
      shirtNumber: r.shirtNumber,
    });
  }

  return {
    ok: true,
    bundle: {
      match: {
        id: ctx.matchId,
        leagueId: ctx.leagueId,
        seasonId: ctx.seasonId,
        status: ctx.status,
        homeTeamId: ctx.homeTeamId,
        awayTeamId: ctx.awayTeamId,
        homeTeamName: homeName,
        awayTeamName: awayName,
        homeScore: ctx.homeScore,
        awayScore: ctx.awayScore,
        scheduledAt: ctx.scheduledAt.toISOString(),
        matchday: ctx.matchday,
        roundLabel: ctx.roundLabel,
        venueName,
        categoryName,
        refereeName,
        startedAt: ctx.startedAt?.toISOString() ?? null,
        endedAt: ctx.endedAt?.toISOString() ?? null,
      },
      report: reportMeta,
      operations,
      liveScore,
      foulCounts: {
        home: countTeamFouls(foulRows, ctx.homeTeamId),
        away: countTeamFouls(foulRows, ctx.awayTeamId),
      },
      lineups: lineupRows.map((l) => ({
        id: l.id,
        teamId: l.teamId,
        playerId: l.playerId,
        playerName: names.get(l.playerId) ?? "—",
        slot: l.slot,
        shirtNumber: l.shirtNumber,
      })),
      rosterByTeam,
      goals: goalRows.map((g) => ({
        id: g.id,
        teamId: g.teamId,
        scorerPlayerId: g.scorerPlayerId,
        scorerName: g.scorerPlayerId ? names.get(g.scorerPlayerId) ?? null : null,
        assistPlayerId: g.assistPlayerId,
        assistName: g.assistPlayerId ? names.get(g.assistPlayerId) ?? null : null,
        period: g.period,
        minute: g.minute,
        isOwnGoal: g.isOwnGoal,
        goalKind: g.goalKind,
      })),
      cards: cardRows.map((c) => ({
        id: c.id,
        teamId: c.teamId,
        playerId: c.playerId,
        playerName: c.playerId ? names.get(c.playerId) ?? null : null,
        cardKind: c.cardKind,
        period: c.period,
        minute: c.minute,
      })),
      substitutions: subRows.map((s) => ({
        id: s.id,
        teamId: s.teamId,
        playerOutId: s.playerOutId,
        playerOutName: names.get(s.playerOutId) ?? "—",
        playerInId: s.playerInId,
        playerInName: names.get(s.playerInId) ?? "—",
        period: s.period,
        minute: s.minute,
      })),
      fouls: foulRows.map((f) => ({
        id: f.id,
        offendingTeamId: f.offendingTeamId,
        offendingPlayerId: f.offendingPlayerId,
        offendingPlayerName: f.offendingPlayerId
          ? names.get(f.offendingPlayerId) ?? null
          : null,
        foulKind: f.foulKind,
        period: f.period,
        minute: f.minute,
      })),
      penalties: penRows.map((p) => ({
        id: p.id,
        teamId: p.teamId,
        takerId: p.takerId,
        takerName: p.takerId ? names.get(p.takerId) ?? null : null,
        outcome: p.outcome,
        period: p.period,
        minute: p.minute,
      })),
      onFieldPlayerIds: {
        home: [...(onFieldMap.get(ctx.homeTeamId) ?? [])],
        away: [...(onFieldMap.get(ctx.awayTeamId) ?? [])],
      },
      dbWarnings,
    },
  };
}
