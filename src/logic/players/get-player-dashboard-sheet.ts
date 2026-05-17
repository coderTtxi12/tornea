import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  leagueCategories,
  leagues,
  matchCards,
  matchGoals,
  matchLineups,
  matchPenaltyAttempts,
  matches,
  matchSubstitutions,
  seasons,
  seasonTeams,
  teamRosters,
  teams,
} from "@/db/schema";

import { expandRosterPositionForDisplay } from "@/lib/players/expand-football-position";
import {
  playerCurpUploadSummary,
  playerPhotoStorageFileName,
} from "@/lib/players/player-profile-photo";
import {
  resolvePlayerCurpForDownload,
  resolvePlayerPhotoForImgDisplay,
} from "@/logic/leagues/resolve-supabase-storage-url-for-img-display";

import { getPlayerForOwnerEdit } from "./get-player-for-owner-edit";

/** Partidos que cuentan para estadísticas (ya disputados o walkover). */
const MATCH_STATS_STATUSES = ["live", "finished", "walkover"] as const;

function sportLabelFromCode(code: string): string {
  const c = code.trim().toLowerCase();
  if (c === "football") return "Fútbol";
  if (c === "football_7" || c === "football7" || c === "futbol_7") return "Fútbol 7";
  if (c === "futsal") return "Futsal";
  if (c === "basketball" || c === "basket") return "Básquetbol";
  if (!c) return "Deporte";
  return c
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type PlayerDashboardSheetPayload = {
  player: {
    id: string;
    fullName: string;
    birthDate: string;
    photoUrl: string | null;
    /** Nombre sugerido al descargar la foto (basename en Storage). */
    photoFileName: string | null;
    /** `metadata.curp`: hay archivo subido (p. ej. CURP). */
    curpUploaded: boolean;
    /** URL firmada para descargar CURP; null si no hay archivo o falla la firma. */
    curpDownloadUrl: string | null;
    /** Nombre sugerido al descargar CURP. */
    curpFileName: string | null;
    /** CURP capturada en `players.doc_id`. */
    docId: string | null;
  };
  context: {
    leagueId: string;
    leagueName: string;
    sportLabel: string;
    teamId: string;
    teamName: string;
    teamShort: string | null;
    shirtNumber: number | null;
    position: string | null;
    /** Posición lista para UI (abreviaturas → nombre completo en fútbol). */
    positionLabel: string;
    /** `team_rosters.registered_at` (alta en esta fila de plantilla). ISO 8601 o null. */
    rosterRegisteredAt: string | null;
    /** Categoría del equipo en la temporada de la plantilla (`season_teams` → `league_categories`). */
    leagueCategoryName: string | null;
  };
  stats: {
    appearances: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    /** Penales de juego (`match_penalty_attempts`) donde el jugador es lanzador. */
    penaltiesTaken: number;
    penaltiesScored: number;
  };
};

/** Drizzle/pg pueden devolver bigint u otros tipos; NextResponse.json falla con BigInt. */
function intFromAggregate(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export async function getPlayerDashboardSheet(
  ownerUserId: string,
  leagueId: string,
  teamId: string,
  playerId: string,
): Promise<PlayerDashboardSheetPayload | "FORBIDDEN" | "NOT_FOUND"> {
  const base = await getPlayerForOwnerEdit(ownerUserId, leagueId, teamId, playerId);
  if (base === "FORBIDDEN" || base === "NOT_FOUND") {
    return base;
  }

  const db = getDb();

  const leagueTeamRows = await db
    .select({
      leagueName: leagues.name,
      sportCode: leagues.sportCode,
      teamName: teams.name,
      teamShort: teams.shortName,
    })
    .from(teams)
    .innerJoin(leagues, eq(leagues.id, teams.leagueId))
    .where(and(eq(teams.id, teamId), eq(leagues.id, leagueId)))
    .limit(1);

  const lt = leagueTeamRows[0];
  if (!lt) {
    return "NOT_FOUND";
  }

  const leagueNameSafe = (lt.leagueName ?? "").trim() || "Liga";
  const teamNameSafe = (lt.teamName ?? "").trim() || "Equipo";

  let leagueCategoryName: string | null = null;
  try {
    const [st] = await db
      .select({ name: leagueCategories.name })
      .from(seasonTeams)
      .leftJoin(leagueCategories, eq(leagueCategories.id, seasonTeams.leagueCategoryId))
      .where(
        and(eq(seasonTeams.seasonId, base.roster.seasonId), eq(seasonTeams.teamId, teamId)),
      )
      .limit(1);
    const cn = st?.name;
    leagueCategoryName = typeof cn === "string" && cn.trim() ? cn.trim() : null;
  } catch {
    /* migraciones / sin fila season_teams */
  }

  const matchFilter = and(
    eq(seasons.leagueId, leagueId),
    inArray(matches.status, [...MATCH_STATS_STATUSES]),
  );

  let appearances = 0;
  let goals = 0;
  let assists = 0;
  let yellowCards = 0;
  let redCards = 0;
  let penaltiesTaken = 0;
  let penaltiesScored = 0;

  /** Cada consulta aislada: en BD sin migración completa algunas tablas no existen (42P01). */
  const settled = await Promise.allSettled([
    db
      .select({ mid: matchLineups.matchId })
      .from(matchLineups)
      .innerJoin(matches, eq(matches.id, matchLineups.matchId))
      .innerJoin(seasons, eq(seasons.id, matches.seasonId))
      .where(
        and(
          eq(matchLineups.playerId, playerId),
          eq(matchLineups.teamId, teamId),
          matchFilter,
        ),
      ),
    db
      .select({ mid: matchSubstitutions.matchId })
      .from(matchSubstitutions)
      .innerJoin(matches, eq(matches.id, matchSubstitutions.matchId))
      .innerJoin(seasons, eq(seasons.id, matches.seasonId))
      .where(
        and(
          eq(matchSubstitutions.playerInId, playerId),
          eq(matchSubstitutions.teamId, teamId),
          matchFilter,
        ),
      ),
    db
      .select({ mid: matchSubstitutions.matchId })
      .from(matchSubstitutions)
      .innerJoin(matches, eq(matches.id, matchSubstitutions.matchId))
      .innerJoin(seasons, eq(seasons.id, matches.seasonId))
      .where(
        and(
          eq(matchSubstitutions.playerOutId, playerId),
          eq(matchSubstitutions.teamId, teamId),
          matchFilter,
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(matchGoals)
      .innerJoin(matches, eq(matches.id, matchGoals.matchId))
      .innerJoin(seasons, eq(seasons.id, matches.seasonId))
      .where(
        and(
          eq(matchGoals.scorerPlayerId, playerId),
          eq(matchGoals.teamId, teamId),
          eq(matchGoals.isOwnGoal, false),
          matchFilter,
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(matchGoals)
      .innerJoin(matches, eq(matches.id, matchGoals.matchId))
      .innerJoin(seasons, eq(seasons.id, matches.seasonId))
      .where(
        and(
          eq(matchGoals.assistPlayerId, playerId),
          eq(matchGoals.teamId, teamId),
          matchFilter,
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(matchCards)
      .innerJoin(matches, eq(matches.id, matchCards.matchId))
      .innerJoin(seasons, eq(seasons.id, matches.seasonId))
      .where(
        and(
          eq(matchCards.playerId, playerId),
          eq(matchCards.teamId, teamId),
          eq(matchCards.cardKind, "yellow"),
          matchFilter,
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(matchCards)
      .innerJoin(matches, eq(matches.id, matchCards.matchId))
      .innerJoin(seasons, eq(seasons.id, matches.seasonId))
      .where(
        and(
          eq(matchCards.playerId, playerId),
          eq(matchCards.teamId, teamId),
          inArray(matchCards.cardKind, ["red", "second_yellow"]),
          matchFilter,
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(matchPenaltyAttempts)
      .innerJoin(matches, eq(matches.id, matchPenaltyAttempts.matchId))
      .innerJoin(seasons, eq(seasons.id, matches.seasonId))
      .where(
        and(
          eq(matchPenaltyAttempts.takerId, playerId),
          eq(matchPenaltyAttempts.teamId, teamId),
          matchFilter,
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(matchPenaltyAttempts)
      .innerJoin(matches, eq(matches.id, matchPenaltyAttempts.matchId))
      .innerJoin(seasons, eq(seasons.id, matches.seasonId))
      .where(
        and(
          eq(matchPenaltyAttempts.takerId, playerId),
          eq(matchPenaltyAttempts.teamId, teamId),
          eq(matchPenaltyAttempts.outcome, "scored"),
          matchFilter,
        ),
      ),
  ]);

  const lineupRows = settled[0].status === "fulfilled" ? settled[0].value : [];
  const subInRows = settled[1].status === "fulfilled" ? settled[1].value : [];
  const subOutRows = settled[2].status === "fulfilled" ? settled[2].value : [];
  const goalsRows = settled[3].status === "fulfilled" ? settled[3].value : [];
  const assistsRows = settled[4].status === "fulfilled" ? settled[4].value : [];
  const yellowRows = settled[5].status === "fulfilled" ? settled[5].value : [];
  const redRows = settled[6].status === "fulfilled" ? settled[6].value : [];
  const penaltiesTakenRows = settled[7].status === "fulfilled" ? settled[7].value : [];
  const penaltiesScoredRows = settled[8].status === "fulfilled" ? settled[8].value : [];

  appearances = new Set([
    ...lineupRows.map((r) => r.mid),
    ...subInRows.map((r) => r.mid),
    ...subOutRows.map((r) => r.mid),
  ]).size;

  goals = intFromAggregate(goalsRows[0]?.n);
  assists = intFromAggregate(assistsRows[0]?.n);
  yellowCards = intFromAggregate(yellowRows[0]?.n);
  redCards = intFromAggregate(redRows[0]?.n);
  penaltiesTaken = intFromAggregate(penaltiesTakenRows[0]?.n);
  penaltiesScored = intFromAggregate(penaltiesScoredRows[0]?.n);

  let photoUrl: string | null = null;
  try {
    photoUrl = await resolvePlayerPhotoForImgDisplay(base.player.metadata);
  } catch {
    photoUrl = null;
  }

  const birthDate =
    typeof base.player.birthDate === "string" ? base.player.birthDate : "";

  const fullNameSafe = (base.player.fullName ?? "").trim() || "Sin nombre";

  const curpSummary = playerCurpUploadSummary(base.player.metadata);
  const curpUploaded = curpSummary.uploaded;

  let curpDownloadUrl: string | null = null;
  if (curpUploaded) {
    try {
      curpDownloadUrl = await resolvePlayerCurpForDownload(base.player.metadata);
    } catch {
      curpDownloadUrl = null;
    }
  }

  const photoFileName = playerPhotoStorageFileName(base.player.metadata);

  let rosterRegisteredAt: string | null = null;
  try {
    const [rp] = await db
      .select({ registeredAt: teamRosters.registeredAt })
      .from(teamRosters)
      .where(eq(teamRosters.id, base.roster.id))
      .limit(1);
    const reg = rp?.registeredAt;
    if (reg != null) {
      const d = reg instanceof Date ? reg : new Date(String(reg));
      if (!Number.isNaN(d.getTime())) {
        rosterRegisteredAt = d.toISOString();
      }
    }
  } catch {
    /* columnas opcionales / migraciones: la ficha sigue sin estos campos */
  }

  return {
    player: {
      id: base.player.id,
      fullName: fullNameSafe,
      birthDate,
      photoUrl,
      photoFileName: photoFileName ?? null,
      curpUploaded,
      curpDownloadUrl,
      curpFileName: curpSummary.fileName,
      docId: base.player.docId,
    },
    context: {
      leagueId,
      leagueName: leagueNameSafe,
      sportLabel: sportLabelFromCode(typeof lt.sportCode === "string" ? lt.sportCode : ""),
      teamId,
      teamName: teamNameSafe,
      teamShort: lt.teamShort ?? null,
      shirtNumber: base.roster.shirtNumber ?? null,
      position: base.roster.position ?? null,
      positionLabel: expandRosterPositionForDisplay(
        base.roster.position,
        typeof lt.sportCode === "string" ? lt.sportCode : null,
      ),
      rosterRegisteredAt,
      leagueCategoryName,
    },
    stats: {
      appearances,
      goals,
      assists,
      yellowCards,
      redCards,
      penaltiesTaken,
      penaltiesScored,
    },
  };
}
