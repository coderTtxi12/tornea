import { NextResponse } from "next/server";

import { newMatchJsonSchema } from "@/components/dashboard/leagues/new-match-form-schema";
import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import { AppAuditEntityType, recordAppAuditLog } from "@/logic/audit";
import {
  createMatchInLeague,
  type CreateMatchInLeagueResult,
} from "@/logic/leagues/create-match-in-league";
import { createClient } from "@/lib/supabase/server";

function mapCreateError(
  reason: Extract<CreateMatchInLeagueResult, { ok: false }>["reason"],
): { status: number; message: string } {
  switch (reason) {
    case "forbidden":
      return { status: 403, message: "No autorizado" };
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
    default:
      return { status: 400, message: "No se pudo crear el partido." };
  }
}

/**
 * POST — alta de partido (`matches`) anclado a `season_id` y equipos validados vía `season_teams`.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ leagueId: string }> },
) {
  try {
    const { leagueId } = await context.params;
    if (!leagueId) {
      return NextResponse.json({ error: "Liga no válida" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const appUser = await syncAppUserFromSupabaseAuthUser(user);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = newMatchJsonSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && fields[key] === undefined) {
          fields[key] = issue.message;
        }
      }
      return NextResponse.json({ error: "Validación", fields }, { status: 400 });
    }

    const d = parsed.data;
    const scheduledAt = new Date(d.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { error: "Validación", fields: { scheduledAt: "La fecha u hora no es válida." } },
        { status: 400 },
      );
    }

    const result = await createMatchInLeague({
      actorUserId: appUser.id,
      leagueId,
      seasonId: d.seasonId,
      homeTeamId: d.homeTeamId,
      awayTeamId: d.awayTeamId,
      scheduledAt,
      venueId: d.venueId ?? null,
      leagueCategoryId: d.leagueCategoryId ?? null,
      roundLabel: d.roundLabel ?? null,
      notes: d.notes ?? null,
    });

    if (!result.ok) {
      const { status, message } = mapCreateError(result.reason);
      return NextResponse.json({ error: message }, { status });
    }

    await recordAppAuditLog({
      actorUserId: appUser.id,
      action: "create",
      entityType: AppAuditEntityType.match,
      entityId: result.matchId,
      leagueId,
      summary: "Partido programado",
      metadata: {
        seasonId: d.seasonId,
        homeTeamId: d.homeTeamId,
        awayTeamId: d.awayTeamId,
        roundLabel: d.roundLabel ?? null,
      },
    });

    return NextResponse.json({ matchId: result.matchId }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/leagues/.../matches]", e);
    return NextResponse.json({ error: "No se pudo crear el partido" }, { status: 500 });
  }
}
