import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  leagueCategories,
  leagues,
  matches,
  seasons,
  seasonTeams,
  teams,
  venues,
} from "@/db/schema";

import { userCanManageLeague } from "./league-dashboard-admin";

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
        | "bad_teams_league";
    };

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

  const [created] = await db
    .insert(matches)
    .values({
      seasonId: input.seasonId,
      leagueCategoryId: catId,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      scheduledAt: input.scheduledAt,
      timezone: league.timezone,
      roundLabel,
      venueId,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      status: "scheduled",
    })
    .returning({ id: matches.id });

  return { ok: true, matchId: created!.id };
}
