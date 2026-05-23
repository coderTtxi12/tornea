import { NextResponse } from "next/server";

import { requireAppUser, validationErrorFromZod, validationErrorResponse } from "@/lib/api";

import { newMatchJsonSchema } from "@/schemas/dashboard/new-match-form-schema";
import { AppAuditEntityType, recordAppAuditLog } from "@/logic/audit";
import {
  updateMatchInLeague,
  type UpdateMatchInLeagueResult,
} from "@/logic/leagues/create-match-in-league";

function mapUpdateError(
  reason: Extract<UpdateMatchInLeagueResult, { ok: false }>["reason"],
): { status: number; message: string } {
  switch (reason) {
    case "forbidden":
      return { status: 403, message: "No autorizado" };
    case "match_not_found":
      return { status: 404, message: "Partido no encontrado" };
    case "match_not_editable":
      return {
        status: 409,
        message: "Este partido ya está terminado o resuelto por walkover y no se puede editar.",
      };
    case "season_not_found":
      return { status: 404, message: "Temporada no encontrada" };
    case "same_team":
      return { status: 400, message: "Local y visitante deben ser distintos." };
    case "missing_home_enrollment":
    case "missing_away_enrollment":
      return {
        status: 400,
        message: "Ambos equipos deben estar inscritos en esta temporada (season_teams).",
      };
    case "category_mismatch":
      return {
        status: 400,
        message:
          "La categoría del partido no coincide con la inscripción de uno o ambos equipos para esta temporada.",
      };
    case "bad_venue":
      return { status: 400, message: "La cancha no pertenece a esta liga." };
    case "bad_category":
      return { status: 400, message: "Categoría inválida para esta liga." };
    case "bad_teams_league":
      return { status: 400, message: "Uno o ambos equipos no pertenecen a esta liga." };
    case "bad_league_referee":
      return {
        status: 400,
        message: "El árbitro elegido no pertenece a esta liga o no existe.",
      };
    default:
      return { status: 400, message: "No se pudo actualizar el partido." };
  }
}

/**
 * PATCH — actualiza un partido (`matches`) con las mismas reglas que POST.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ leagueId: string; matchId: string }> },
) {
  try {
    const { leagueId, matchId } = await context.params;
    if (!leagueId || !matchId) {
      return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 });
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = newMatchJsonSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorFromZod(parsed.error);
    }

    const d = parsed.data;
    const scheduledAt = new Date(d.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return validationErrorResponse({
        scheduledAt: "La fecha u hora no es válida.",
      });
    }

    const result = await updateMatchInLeague({
      actorUserId: appUser.id,
      leagueId,
      matchId,
      seasonId: d.seasonId,
      homeTeamId: d.homeTeamId,
      awayTeamId: d.awayTeamId,
      scheduledAt,
      venueId: d.venueId ?? null,
      leagueCategoryId: d.leagueCategoryId ?? null,
      roundLabel: d.roundLabel ?? null,
      notes: d.notes ?? null,
      leagueRefereeId: d.leagueRefereeId ?? null,
      playersOnFieldPerTeam: d.playersOnFieldPerTeam ?? null,
      firstHalfMinutes: d.firstHalfMinutes ?? null,
      halftimeBreakMinutes: d.halftimeBreakMinutes ?? null,
      secondHalfMinutes: d.secondHalfMinutes ?? null,
    });

    if (!result.ok) {
      const { status, message } = mapUpdateError(result.reason);
      return NextResponse.json({ error: message }, { status });
    }

    await recordAppAuditLog({
      actorUserId: appUser.id,
      action: "update",
      entityType: AppAuditEntityType.match,
      entityId: matchId,
      leagueId,
      summary: "Partido actualizado",
      metadata: {
        seasonId: d.seasonId,
        homeTeamId: d.homeTeamId,
        awayTeamId: d.awayTeamId,
        roundLabel: d.roundLabel ?? null,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[PATCH /api/leagues/.../matches/...]", e);
    return NextResponse.json({ error: "No se pudo actualizar el partido" }, { status: 500 });
  }
}
