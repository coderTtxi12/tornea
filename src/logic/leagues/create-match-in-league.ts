import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  leagueCategories,
  leagueReferees,
  leagues,
  matches,
  seasons,
  seasonTeams,
  teams,
  venues,
} from "@/db/schema";

import { userCanManageLeague } from "./league-dashboard-admin";
import { readLeagueCategoryMetadata } from "./league-category-metadata";
import {
  mergeMatchReportMetadata,
  regulationMinutesFromHalves,
} from "./match-report-metadata";

export type CreateMatchInLeagueInput = {
  actorUserId: string;
  leagueId: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
  venueId?: string | null;
  leagueCategoryId?: string | null;
  /** `matches.round_label` (final, semifinal, etc.). */
  roundLabel?: string | null;
  notes?: string | null;
  /** Directorio `league_referees` (opcional). */
  leagueRefereeId?: string | null;
  /** `matches.report.playersOnFieldPerTeam` (opcional; no altera la categoría). */
  playersOnFieldPerTeam?: number | null;
  firstHalfMinutes?: number | null;
  halftimeBreakMinutes?: number | null;
  secondHalfMinutes?: number | null;
};

export type CreateMatchInLeagueResult =
  | { ok: true; matchId: string }
  | {
      ok: false;
      reason:
        | "forbidden"
        | "season_not_found"
        | "same_team"
        | "missing_home_enrollment"
        | "missing_away_enrollment"
        | "category_mismatch"
        | "bad_venue"
        | "bad_category"
        | "bad_teams_league"
        | "bad_league_referee";
    };

type MatchScheduleCoreError = Exclude<CreateMatchInLeagueResult, { ok: true }>["reason"];

type MatchScheduleCoreInput = {
  leagueId: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  leagueCategoryId?: string | null;
  venueId?: string | null;
  roundLabel?: string | null;
  notes?: string | null;
};

type MatchScheduleCoreOk = {
  leagueTimezone: string;
  catId: string | null;
  venueId: string | null;
  roundLabel: string | null;
  notes: string | null;
};

async function resolveLeagueRefereeIdForMatch(
  db: ReturnType<typeof getDb>,
  leagueId: string,
  raw: string | null | undefined,
): Promise<{ ok: true; id: string | null } | { ok: false; reason: "bad_league_referee" }> {
  const t = raw?.trim();
  if (!t) {
    return { ok: true, id: null };
  }
  const [r] = await db
    .select({ id: leagueReferees.id })
    .from(leagueReferees)
    .where(and(eq(leagueReferees.id, t), eq(leagueReferees.leagueId, leagueId)))
    .limit(1);
  if (!r) {
    return { ok: false, reason: "bad_league_referee" };
  }
  return { ok: true, id: r.id };
}

type ResolvedMatchDuration = {
  firstHalfMinutes: number;
  halftimeBreakMinutes: number;
  secondHalfMinutes: number;
};

async function resolveMatchDurationForSave(
  db: ReturnType<typeof getDb>,
  leagueId: string,
  categoryId: string | null,
  fromInput: {
    firstHalfMinutes?: number | null;
    halftimeBreakMinutes?: number | null;
    secondHalfMinutes?: number | null;
  },
): Promise<ResolvedMatchDuration | null> {
  const fromBody =
    fromInput.firstHalfMinutes != null &&
    fromInput.halftimeBreakMinutes != null &&
    fromInput.secondHalfMinutes != null
      ? {
          firstHalfMinutes: fromInput.firstHalfMinutes,
          halftimeBreakMinutes: fromInput.halftimeBreakMinutes,
          secondHalfMinutes: fromInput.secondHalfMinutes,
        }
      : null;
  if (fromBody) return fromBody;
  if (!categoryId) return null;
  const [cat] = await db
    .select({ metadata: leagueCategories.metadata })
    .from(leagueCategories)
    .where(and(eq(leagueCategories.id, categoryId), eq(leagueCategories.leagueId, leagueId)))
    .limit(1);
  if (!cat) return null;
  const meta = readLeagueCategoryMetadata(cat.metadata);
  if (
    meta.firstHalfMinutes == null ||
    meta.halftimeBreakMinutes == null ||
    meta.secondHalfMinutes == null
  ) {
    return null;
  }
  return {
    firstHalfMinutes: meta.firstHalfMinutes,
    halftimeBreakMinutes: meta.halftimeBreakMinutes,
    secondHalfMinutes: meta.secondHalfMinutes,
  };
}

/**
 * Valida temporada, equipos, categoría y cancha para alta o edición de un partido en una liga.
 */
async function resolveMatchScheduleCore(
  db: ReturnType<typeof getDb>,
  input: MatchScheduleCoreInput,
): Promise<{ ok: true; data: MatchScheduleCoreOk } | { ok: false; reason: MatchScheduleCoreError }> {
  const [league] = await db
    .select({
      timezone: leagues.timezone,
    })
    .from(leagues)
    .where(eq(leagues.id, input.leagueId))
    .limit(1);
  if (!league) {
    return { ok: false, reason: "forbidden" };
  }

  const [season] = await db
    .select({ id: seasons.id, leagueId: seasons.leagueId })
    .from(seasons)
    .where(eq(seasons.id, input.seasonId))
    .limit(1);
  if (!season || season.leagueId !== input.leagueId) {
    return { ok: false, reason: "season_not_found" };
  }

  const teamCheck = await db
    .select({ id: teams.id, leagueId: teams.leagueId })
    .from(teams)
    .where(inArray(teams.id, [input.homeTeamId, input.awayTeamId]));
  if (teamCheck.length !== 2) {
    return { ok: false, reason: "bad_teams_league" };
  }
  for (const r of teamCheck) {
    if (r.leagueId !== input.leagueId) {
      return { ok: false, reason: "bad_teams_league" };
    }
  }

  const [homeSt] = await db
    .select({ leagueCategoryId: seasonTeams.leagueCategoryId })
    .from(seasonTeams)
    .where(and(eq(seasonTeams.seasonId, input.seasonId), eq(seasonTeams.teamId, input.homeTeamId)))
    .limit(1);
  const [awaySt] = await db
    .select({ leagueCategoryId: seasonTeams.leagueCategoryId })
    .from(seasonTeams)
    .where(and(eq(seasonTeams.seasonId, input.seasonId), eq(seasonTeams.teamId, input.awayTeamId)))
    .limit(1);

  if (!homeSt) {
    return { ok: false, reason: "missing_home_enrollment" };
  }
  if (!awaySt) {
    return { ok: false, reason: "missing_away_enrollment" };
  }

  const catId = input.leagueCategoryId ?? null;
  if (catId != null) {
    const [cat] = await db
      .select({ id: leagueCategories.id })
      .from(leagueCategories)
      .where(and(eq(leagueCategories.id, catId), eq(leagueCategories.leagueId, input.leagueId)))
      .limit(1);
    if (!cat) {
      return { ok: false, reason: "bad_category" };
    }
    if (homeSt.leagueCategoryId !== catId || awaySt.leagueCategoryId !== catId) {
      return { ok: false, reason: "category_mismatch" };
    }
  }

  let venueId: string | null = input.venueId ?? null;
  if (venueId) {
    const [v] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(and(eq(venues.id, venueId), eq(venues.leagueId, input.leagueId)))
      .limit(1);
    if (!v) {
      return { ok: false, reason: "bad_venue" };
    }
  } else {
    venueId = null;
  }

  const roundLabel =
    input.roundLabel?.trim() ? input.roundLabel.trim().slice(0, 120) : null;

  return {
    ok: true,
    data: {
      leagueTimezone: league.timezone,
      catId,
      venueId,
      roundLabel,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    },
  };
}

/**
 * Crea un partido (`matches`) validando inscripción en `season_teams` y categoría si aplica.
 */
export async function createMatchInLeague(
  input: CreateMatchInLeagueInput,
): Promise<CreateMatchInLeagueResult> {
  const db = getDb();

  if (input.homeTeamId === input.awayTeamId) {
    return { ok: false, reason: "same_team" };
  }

  const allowed = await userCanManageLeague(db, input.leagueId, input.actorUserId);
  if (!allowed) {
    return { ok: false, reason: "forbidden" };
  }

  const core = await resolveMatchScheduleCore(db, {
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    leagueCategoryId: input.leagueCategoryId,
    venueId: input.venueId,
    roundLabel: input.roundLabel,
    notes: input.notes,
  });
  if (!core.ok) {
    return { ok: false, reason: core.reason };
  }
  const { leagueTimezone, catId, venueId, roundLabel, notes } = core.data;

  const refRes = await resolveLeagueRefereeIdForMatch(db, input.leagueId, input.leagueRefereeId);
  if (!refRes.ok) {
    return { ok: false, reason: refRes.reason };
  }

  const duration = await resolveMatchDurationForSave(db, input.leagueId, catId, {
    firstHalfMinutes: input.firstHalfMinutes,
    halftimeBreakMinutes: input.halftimeBreakMinutes,
    secondHalfMinutes: input.secondHalfMinutes,
  });

  const report = mergeMatchReportMetadata({}, {
    playersOnFieldPerTeam: input.playersOnFieldPerTeam ?? null,
    firstHalfMinutes: duration?.firstHalfMinutes ?? null,
    halftimeBreakMinutes: duration?.halftimeBreakMinutes ?? null,
    secondHalfMinutes: duration?.secondHalfMinutes ?? null,
  });

  const [created] = await db
    .insert(matches)
    .values({
      seasonId: input.seasonId,
      leagueCategoryId: catId,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      scheduledAt: input.scheduledAt,
      timezone: leagueTimezone,
      roundLabel,
      venueId,
      notes,
      leagueRefereeId: refRes.id,
      status: "scheduled",
      regulationMinutes: duration
        ? regulationMinutesFromHalves(
            duration.firstHalfMinutes,
            duration.secondHalfMinutes,
          )
        : undefined,
      report,
    })
    .returning({ id: matches.id });

  return { ok: true, matchId: created!.id };
}

export type UpdateMatchInLeagueInput = CreateMatchInLeagueInput & { matchId: string };

export type UpdateMatchInLeagueResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | MatchScheduleCoreError
        | "forbidden"
        | "same_team"
        | "match_not_found";
    };

/**
 * Actualiza un partido existente (`matches`) con las mismas reglas que el alta.
 */
export async function updateMatchInLeague(
  input: UpdateMatchInLeagueInput,
): Promise<UpdateMatchInLeagueResult> {
  const db = getDb();

  if (input.homeTeamId === input.awayTeamId) {
    return { ok: false, reason: "same_team" };
  }

  const allowed = await userCanManageLeague(db, input.leagueId, input.actorUserId);
  if (!allowed) {
    return { ok: false, reason: "forbidden" };
  }

  const [existing] = await db
    .select({
      id: matches.id,
      report: matches.report,
    })
    .from(matches)
    .innerJoin(seasons, eq(matches.seasonId, seasons.id))
    .where(and(eq(matches.id, input.matchId), eq(seasons.leagueId, input.leagueId)))
    .limit(1);

  if (!existing) {
    return { ok: false, reason: "match_not_found" };
  }

  const core = await resolveMatchScheduleCore(db, {
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    leagueCategoryId: input.leagueCategoryId,
    venueId: input.venueId,
    roundLabel: input.roundLabel,
    notes: input.notes,
  });
  if (!core.ok) {
    return { ok: false, reason: core.reason };
  }
  const { leagueTimezone, catId, venueId, roundLabel, notes } = core.data;

  const refRes = await resolveLeagueRefereeIdForMatch(db, input.leagueId, input.leagueRefereeId);
  if (!refRes.ok) {
    return { ok: false, reason: refRes.reason };
  }

  const duration = await resolveMatchDurationForSave(db, input.leagueId, catId, {
    firstHalfMinutes: input.firstHalfMinutes,
    halftimeBreakMinutes: input.halftimeBreakMinutes,
    secondHalfMinutes: input.secondHalfMinutes,
  });

  const report = mergeMatchReportMetadata(existing.report, {
    playersOnFieldPerTeam: input.playersOnFieldPerTeam ?? null,
    firstHalfMinutes: duration?.firstHalfMinutes ?? null,
    halftimeBreakMinutes: duration?.halftimeBreakMinutes ?? null,
    secondHalfMinutes: duration?.secondHalfMinutes ?? null,
  });

  await db
    .update(matches)
    .set({
      seasonId: input.seasonId,
      leagueCategoryId: catId,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      scheduledAt: input.scheduledAt,
      timezone: leagueTimezone,
      roundLabel,
      venueId,
      notes,
      leagueRefereeId: refRes.id,
      regulationMinutes: duration
        ? regulationMinutesFromHalves(
            duration.firstHalfMinutes,
            duration.secondHalfMinutes,
          )
        : undefined,
      report,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, input.matchId));

  return { ok: true };
}
