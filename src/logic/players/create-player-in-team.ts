import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  leagues,
  players,
  seasonTeams,
  teamRosters,
  teams,
} from "@/db/schema";
import { ensureTargetSeasonIdForLeagueTx } from "@/logic/leagues/create-team-in-league";
import { userCanManageLeague } from "@/logic/leagues/league-dashboard-admin";

export type NewPlayerInsert = {
  ownerUserId: string;
  leagueId: string;
  teamId: string;
  fullName: string;
  /** `YYYY-MM-DD` → columna `players.birth_date`. */
  birthDate: string;
  /** `null` si no se capturó. Se guarda en `team_rosters.shirt_number`. */
  shirtNumber: number | null;
  /** Texto libre opcional. Se guarda en `team_rosters.position`. */
  position: string | null;
  /** Opcional, queda en `players.metadata.whatsappE164`. */
  whatsappE164: string | null;
};

export type CreatedPlayer = {
  playerId: string;
  seasonId: string;
  teamRosterId: string;
};

/**
 * Crea `players` + `team_rosters` (categoría a través de la inscripción del equipo en la
 * temporada objetivo). Dueño o administrador del panel. Si el equipo no
 * tiene inscripción `season_teams` en la temporada objetivo, se crea automáticamente sin
 * categoría — la app validará después que coincida con la del equipo.
 */
export async function createPlayerInTeam(
  args: NewPlayerInsert,
): Promise<CreatedPlayer & { leagueOwnerUserId: string }> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [leagueRow] = await tx
      .select({ id: leagues.id, ownerUserId: leagues.ownerUserId })
      .from(leagues)
      .where(eq(leagues.id, args.leagueId))
      .limit(1);
    if (!leagueRow) {
      throw new Error("NOT_FOUND");
    }
    if (!(await userCanManageLeague(tx, args.leagueId, args.ownerUserId))) {
      throw new Error("FORBIDDEN");
    }

    const team = await tx
      .select({ id: teams.id, leagueId: teams.leagueId })
      .from(teams)
      .where(eq(teams.id, args.teamId))
      .limit(1);
    if (!team[0]) {
      throw new Error("TEAM_NOT_FOUND");
    }
    if (team[0].leagueId !== args.leagueId) {
      throw new Error("TEAM_LEAGUE_MISMATCH");
    }

    const seasonId = await ensureTargetSeasonIdForLeagueTx(tx, args.leagueId);

    const existingEnroll = await tx
      .select({ id: seasonTeams.id })
      .from(seasonTeams)
      .where(and(eq(seasonTeams.seasonId, seasonId), eq(seasonTeams.teamId, args.teamId)))
      .limit(1);

    if (!existingEnroll[0]) {
      await tx.insert(seasonTeams).values({
        seasonId,
        teamId: args.teamId,
        leagueCategoryId: null,
      });
    }

    const baseMetadata: Record<string, unknown> = {};
    if (args.whatsappE164) baseMetadata.whatsappE164 = args.whatsappE164;

    const [created] = await tx
      .insert(players)
      .values({
        leagueId: args.leagueId,
        fullName: args.fullName.trim(),
        birthDate: args.birthDate,
        metadata: baseMetadata,
      })
      .returning({ id: players.id });

    if (!created) {
      throw new Error("No se pudo crear el jugador.");
    }

    const [roster] = await tx
      .insert(teamRosters)
      .values({
        seasonId,
        teamId: args.teamId,
        playerId: created.id,
        shirtNumber: args.shirtNumber,
        position: args.position?.trim() || null,
      })
      .returning({ id: teamRosters.id });

    if (!roster) {
      throw new Error("No se pudo registrar al jugador en la plantilla.");
    }

    return {
      playerId: created.id,
      seasonId,
      teamRosterId: roster.id,
      leagueOwnerUserId: leagueRow.ownerUserId,
    };
  });
}

/**
 * Mezcla un parche dentro de `players.metadata` (objeto). No reemplaza el resto de claves.
 */
export async function mergePlayerMetadata(
  playerId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  const db = getDb();

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ metadata: players.metadata })
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1);
    if (!row) {
      throw new Error("Jugador no encontrado al actualizar metadata.");
    }
    const prev =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const next = { ...prev, ...patch };
    await tx
      .update(players)
      .set({ metadata: next, updatedAt: new Date() })
      .where(eq(players.id, playerId));
  });
}

/** Borra el jugador (cascade lleva `team_rosters`). */
export async function deletePlayerById(playerId: string): Promise<void> {
  const db = getDb();
  await db.delete(players).where(eq(players.id, playerId));
}
