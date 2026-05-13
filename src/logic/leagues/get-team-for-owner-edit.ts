import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagues, seasonTeams, seasons, teams } from "@/db/schema";

import { userCanManageLeague } from "./league-dashboard-admin";
import { pickTargetSeasonIdFromCandidates, type SeasonPickRow } from "./season-pick";
import type { TeamRegistrationContacts } from "./create-team-in-league";

export type TeamEditPayload = {
  team: {
    id: string;
    leagueId: string;
    name: string;
    shortName: string | null;
    crestUrl: string | null;
    status: "active" | "inactive" | "withdrawn";
  };
  seasonTeam: {
    id: string;
    seasonId: string;
    leagueCategoryId: string | null;
  } | null;
  contacts: TeamRegistrationContacts;
};

function emptyContacts(): TeamRegistrationContacts {
  return {
    director: { fullName: "", email: null, whatsappE164: "" },
    additional: { fullName: "", email: null, whatsappE164: "" },
  };
}

function parseContactsFromMetadata(metadata: unknown): TeamRegistrationContacts {
  const base = emptyContacts();
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return base;
  }
  const rc = (metadata as Record<string, unknown>).registrationContacts;
  if (!rc || typeof rc !== "object" || Array.isArray(rc)) {
    return base;
  }
  const o = rc as Record<string, unknown>;
  const dir = o.director;
  const add = o.additional;
  if (dir && typeof dir === "object" && !Array.isArray(dir)) {
    const d = dir as Record<string, unknown>;
    base.director.fullName =
      typeof d.fullName === "string" ? d.fullName : base.director.fullName;
    base.director.email =
      typeof d.email === "string" && d.email.trim()
        ? d.email.trim().toLowerCase()
        : null;
    base.director.whatsappE164 =
      typeof d.whatsappE164 === "string" ? d.whatsappE164 : base.director.whatsappE164;
  }
  if (add && typeof add === "object" && !Array.isArray(add)) {
    const a = add as Record<string, unknown>;
    base.additional.fullName =
      typeof a.fullName === "string" ? a.fullName : base.additional.fullName;
    base.additional.email =
      typeof a.email === "string" && a.email.trim()
        ? a.email.trim().toLowerCase()
        : null;
    base.additional.whatsappE164 =
      typeof a.whatsappE164 === "string"
        ? a.whatsappE164
        : base.additional.whatsappE164;
  }
  return base;
}

async function pickTargetSeasonIdForLeague(leagueId: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: seasons.id,
      status: seasons.status,
      startsOn: seasons.startsOn,
    })
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));

  return pickTargetSeasonIdFromCandidates(rows as SeasonPickRow[]);
}

/**
 * Carga equipo + inscripción en temporada objetivo (si existe) para edición en panel.
 * Dueño o administrador del panel.
 */
export async function getTeamForOwnerEdit(
  ownerUserId: string,
  leagueId: string,
  teamId: string,
): Promise<TeamEditPayload | "FORBIDDEN" | "NOT_FOUND"> {
  const db = getDb();

  const [row] = await db
    .select({
      teamId: teams.id,
      leagueId: teams.leagueId,
      name: teams.name,
      shortName: teams.shortName,
      crestUrl: teams.crestUrl,
      status: teams.status,
    })
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(and(eq(teams.id, teamId), eq(teams.leagueId, leagueId)))
    .limit(1);

  if (!row) {
    return "NOT_FOUND";
  }
  if (!(await userCanManageLeague(db, leagueId, ownerUserId))) {
    return "FORBIDDEN";
  }

  const targetSeasonId = await pickTargetSeasonIdForLeague(leagueId);

  let seasonTeam: TeamEditPayload["seasonTeam"] = null;
  let metadata: unknown = {};

  if (targetSeasonId) {
    const [st] = await db
      .select({
        id: seasonTeams.id,
        seasonId: seasonTeams.seasonId,
        leagueCategoryId: seasonTeams.leagueCategoryId,
        metadata: seasonTeams.metadata,
      })
      .from(seasonTeams)
      .where(
        and(eq(seasonTeams.teamId, teamId), eq(seasonTeams.seasonId, targetSeasonId)),
      )
      .limit(1);

    if (st) {
      seasonTeam = {
        id: st.id,
        seasonId: st.seasonId,
        leagueCategoryId: st.leagueCategoryId,
      };
      metadata = st.metadata;
    }
  }

  if (!seasonTeam) {
    const [anySt] = await db
      .select({
        id: seasonTeams.id,
        seasonId: seasonTeams.seasonId,
        leagueCategoryId: seasonTeams.leagueCategoryId,
        metadata: seasonTeams.metadata,
      })
      .from(seasonTeams)
      .innerJoin(seasons, eq(seasonTeams.seasonId, seasons.id))
      .where(and(eq(seasonTeams.teamId, teamId), eq(seasons.leagueId, leagueId)))
      .limit(1);

    if (anySt) {
      seasonTeam = {
        id: anySt.id,
        seasonId: anySt.seasonId,
        leagueCategoryId: anySt.leagueCategoryId,
      };
      metadata = anySt.metadata;
    }
  }

  const contacts = parseContactsFromMetadata(metadata);

  return {
    team: {
      id: row.teamId,
      leagueId: row.leagueId,
      name: row.name,
      shortName: row.shortName,
      crestUrl: row.crestUrl,
      status: row.status as "active" | "inactive" | "withdrawn",
    },
    seasonTeam,
    contacts,
  };
}
