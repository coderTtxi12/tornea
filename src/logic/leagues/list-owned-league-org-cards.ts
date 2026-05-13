import { asc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagueCategories, leagues, matches, seasons, teams } from "@/db/schema";
import { pickTargetSeasonIdFromCandidates, type SeasonPickRow } from "@/logic/leagues/season-pick";

import { listManagedLeagueIdsForDashboardUser } from "./league-dashboard-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type OwnedLeagueCategorySummary = {
  id: string;
  code: string;
  name: string;
  gender: "male" | "female" | "mixed" | "unspecified";
  ageMin: number | null;
  ageMax: number | null;
  /** `metadata.birthYearMin` si está y es número. */
  birthYearMin: number | null;
  /** `metadata.birthYearMax` si está y es número. */
  birthYearMax: number | null;
  /** `metadata.minTeamsToStart` si está y es número. */
  minTeamsToStart: number | null;
  /** ISO string de `created_at`. */
  createdAt: string;
};

function pickMetadataInt(metadata: unknown, key: string): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const v = (metadata as Record<string, unknown>)[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export type OwnedLeagueOrgCard = {
  id: string;
  name: string;
  slug: string;
  status: string;
  sportCode: string;
  sportLabel: string;
  seasonLabel: string;
  seasonFormat: string | null;
  teamsTotal: number;
  matchesPlayed: number;
  matchesPending: number;
  /**
   * URL del escudo lista para `<img>`. Signed URL (1h) si el bucket es privado
   * o publicUrl si no se pudo firmar. `null` si no hay escudo.
   */
  shieldUrl: string | null;
  categories: OwnedLeagueCategorySummary[];
};

type ShieldRef = {
  bucket: string;
  path: string;
  publicUrl: string | null;
};

function pickShieldRef(branding: unknown): ShieldRef | null {
  if (!branding || typeof branding !== "object" || Array.isArray(branding)) {
    return null;
  }
  const shield = (branding as Record<string, unknown>).shield;
  if (!shield || typeof shield !== "object" || Array.isArray(shield)) {
    return null;
  }
  const s = shield as Record<string, unknown>;
  const bucket = typeof s.bucket === "string" ? s.bucket : null;
  const path = typeof s.path === "string" ? s.path : null;
  const publicUrl = typeof s.publicUrl === "string" ? s.publicUrl : null;
  if (!bucket || !path) {
    return null;
  }
  return { bucket, path, publicUrl };
}

/** Lifespan de la signed URL emitida para el escudo. */
const SHIELD_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 h

async function resolveShieldUrl(ref: ShieldRef): Promise<string | null> {
  const supabase = createServiceRoleClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(ref.bucket)
        .createSignedUrl(ref.path, SHIELD_SIGNED_URL_TTL_SECONDS);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch {
      /* cae al publicUrl */
    }
  }
  return ref.publicUrl;
}

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

/**
 * Ligas que el usuario gestiona (dueño o admin) con conteos para tarjetas.
 */
export async function listOwnedLeaguesOrganizationCards(
  ownerUserId: string,
): Promise<OwnedLeagueOrgCard[]> {
  const db = getDb();

  const leagueIdsManaged = await listManagedLeagueIdsForDashboardUser(ownerUserId);
  if (leagueIdsManaged.length === 0) {
    return [];
  }

  const owned = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      slug: leagues.slug,
      status: leagues.status,
      sportCode: leagues.sportCode,
      branding: leagues.branding,
    })
    .from(leagues)
    .where(inArray(leagues.id, leagueIdsManaged))
    .orderBy(asc(leagues.createdAt));

  if (owned.length === 0) {
    return [];
  }

  const leagueIds = owned.map((r) => r.id);

  const teamCountRows = await db
    .select({
      leagueId: teams.leagueId,
      n: sql<number>`count(*)::int`,
    })
    .from(teams)
    .where(inArray(teams.leagueId, leagueIds))
    .groupBy(teams.leagueId);

  const teamCountByLeague = new Map<string, number>();
  for (const row of teamCountRows) {
    teamCountByLeague.set(row.leagueId, row.n);
  }

  const matchAggRows = await db
    .select({
      leagueId: seasons.leagueId,
      played: sql<number>`
        count(*) filter (
          where ${matches.status} in ('finished'::match_status, 'walkover'::match_status)
        )::int
      `,
      pending: sql<number>`
        count(*) filter (
          where ${matches.status} in (
            'scheduled'::match_status,
            'live'::match_status,
            'postponed'::match_status
          )
        )::int
      `,
    })
    .from(matches)
    .innerJoin(seasons, eq(matches.seasonId, seasons.id))
    .where(inArray(seasons.leagueId, leagueIds))
    .groupBy(seasons.leagueId);

  const matchAggByLeague = new Map<string, { played: number; pending: number }>();
  for (const row of matchAggRows) {
    matchAggByLeague.set(row.leagueId, { played: row.played, pending: row.pending });
  }

  const seasonRows = await db
    .select({
      id: seasons.id,
      leagueId: seasons.leagueId,
      name: seasons.name,
      status: seasons.status,
      format: seasons.format,
      startsOn: seasons.startsOn,
    })
    .from(seasons)
    .where(inArray(seasons.leagueId, leagueIds));

  const seasonsByLeague = new Map<string, (typeof seasonRows)[number][]>();
  for (const s of seasonRows) {
    const list = seasonsByLeague.get(s.leagueId) ?? [];
    list.push(s);
    seasonsByLeague.set(s.leagueId, list);
  }

  const categoryRows = await db
    .select({
      id: leagueCategories.id,
      leagueId: leagueCategories.leagueId,
      code: leagueCategories.code,
      name: leagueCategories.name,
      gender: leagueCategories.gender,
      ageMin: leagueCategories.ageMin,
      ageMax: leagueCategories.ageMax,
      metadata: leagueCategories.metadata,
      sortOrder: leagueCategories.sortOrder,
      createdAt: leagueCategories.createdAt,
    })
    .from(leagueCategories)
    .where(inArray(leagueCategories.leagueId, leagueIds))
    .orderBy(
      asc(leagueCategories.sortOrder),
      asc(leagueCategories.name),
    );

  const categoriesByLeague = new Map<string, OwnedLeagueCategorySummary[]>();
  for (const c of categoryRows) {
    const list = categoriesByLeague.get(c.leagueId) ?? [];
    list.push({
      id: c.id,
      code: c.code,
      name: c.name,
      gender: c.gender,
      ageMin: c.ageMin,
      ageMax: c.ageMax,
      birthYearMin: pickMetadataInt(c.metadata, "birthYearMin"),
      birthYearMax: pickMetadataInt(c.metadata, "birthYearMax"),
      minTeamsToStart: pickMetadataInt(c.metadata, "minTeamsToStart"),
      createdAt:
        c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt ?? ""),
    });
    categoriesByLeague.set(c.leagueId, list);
  }

  return Promise.all(
    owned.map(async (L) => {
      const agg = matchAggByLeague.get(L.id) ?? { played: 0, pending: 0 };
      const list = seasonsByLeague.get(L.id) ?? [];
      let seasonLabel = "Sin temporada";
      let seasonFormat: string | null = null;
      if (list.length > 0) {
        const topId = pickTargetSeasonIdFromCandidates(list as SeasonPickRow[]);
        const top = list.find((s) => s.id === topId) ?? list[0]!;
        seasonLabel = top.name;
        seasonFormat = top.format;
      }
      if (L.status === "draft") {
        seasonLabel =
          list.length > 0 ? `${seasonLabel} · borrador` : "Liga en borrador";
      }

      const shieldRef = pickShieldRef(L.branding);
      const shieldUrl = shieldRef ? await resolveShieldUrl(shieldRef) : null;

      return {
        id: L.id,
        name: L.name,
        slug: L.slug,
        status: L.status,
        sportCode: L.sportCode,
        sportLabel: sportLabelFromCode(L.sportCode),
        seasonLabel,
        seasonFormat,
        teamsTotal: teamCountByLeague.get(L.id) ?? 0,
        matchesPlayed: agg.played,
        matchesPending: agg.pending,
        shieldUrl,
        categories: categoriesByLeague.get(L.id) ?? [],
      };
    }),
  );
}
