import { and, asc, eq, inArray, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db/client";
import { matches, seasons, teams } from "@/db/schema";

export type RailPendingMatchItem = {
  id: string;
  title: string;
  subtitle: string;
  tone: "urgent" | "default";
};

/**
 * Partidos aún `scheduled` cuya hora de inicio ya pasó: conviene cargar marcador / cerrar.
 * Alcance: temporadas de las ligas indicadas.
 */
export async function listRailPendingMatches(
  leagueIds: string[],
  options?: { limit?: number },
): Promise<RailPendingMatchItem[]> {
  if (leagueIds.length === 0) {
    return [];
  }

  const db = getDb();
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
  const now = new Date();

  const home = alias(teams, "rail_match_home");
  const away = alias(teams, "rail_match_away");

  const rows = await db
    .select({
      id: matches.id,
      matchday: matches.matchday,
      scheduledAt: matches.scheduledAt,
      homeName: home.name,
      awayName: away.name,
    })
    .from(matches)
    .innerJoin(seasons, eq(matches.seasonId, seasons.id))
    .innerJoin(home, eq(matches.homeTeamId, home.id))
    .innerJoin(away, eq(matches.awayTeamId, away.id))
    .where(
      and(
        inArray(seasons.leagueId, leagueIds),
        eq(matches.status, "scheduled"),
        lt(matches.scheduledAt, now),
      ),
    )
    .orderBy(asc(matches.scheduledAt))
    .limit(limit);

  return rows.map((r) => {
    const subtitleParts = [`${r.homeName} vs ${r.awayName}`];
    if (r.matchday != null) {
      subtitleParts.push(`J${r.matchday}`);
    }
    const overdueMs = now.getTime() - r.scheduledAt.getTime();
    const urgent = overdueMs > 48 * 60 * 60 * 1000;
    return {
      id: r.id,
      title: "Cargar resultado del partido",
      subtitle: subtitleParts.join(" · "),
      tone: urgent ? ("urgent" as const) : ("default" as const),
    };
  });
}
