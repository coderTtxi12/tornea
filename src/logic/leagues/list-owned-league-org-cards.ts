import { asc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagueCategories, leagues, matches, seasons, teams } from "@/db/schema";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type OwnedLeagueCategorySummary = {
  id: string;
  code: string;
  name: string;
  gender: "male" | "female" | "mixed" | "unspecified";
};

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

function seasonPickPriority(status: string): number {
  switch (status) {
    case "in_progress":
      return 0;
    case "scheduled":
      return 1;
    case "completed":
      return 2;
    case "cancelled":
      return 3;
    default:
      return 9;
  }
}

function dateSortKey(d: string | null): number {
  if (!d) return 0;
  const t = Date.parse(d);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Ligas del dueño con conteos agregados para tarjetas “Ligas y organizaciones”.
 */
export async function listOwnedLeaguesOrganizationCards(
  ownerUserId: string,
): Promise<OwnedLeagueOrgCard[]> {
  const db = getDb();

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
    .where(eq(leagues.ownerUserId, ownerUserId))
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
      sortOrder: leagueCategories.sortOrder,
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
    list.push({ id: c.id, code: c.code, name: c.name, gender: c.gender });
    categoriesByLeague.set(c.leagueId, list);
  }

  return Promise.all(
    owned.map(async (L) => {
      const agg = matchAggByLeague.get(L.id) ?? { played: 0, pending: 0 };
      const list = seasonsByLeague.get(L.id) ?? [];
      let seasonLabel = "Sin temporada";
      let seasonFormat: string | null = null;
      if (list.length > 0) {
        const sorted = [...list].sort((a, b) => {
          const pa = seasonPickPriority(a.status);
          const pb = seasonPickPriority(b.status);
          if (pa !== pb) return pa - pb;
          const ta = dateSortKey(a.startsOn);
          const tb = dateSortKey(b.startsOn);
          return tb - ta;
        });
        const top = sorted[0]!;
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
