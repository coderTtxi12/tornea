import { NextResponse } from "next/server";

import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import { listSeasonTeamsForScheduling } from "@/logic/leagues/list-season-teams-for-scheduling";
import { createClient } from "@/lib/supabase/server";

/**
 * GET — equipos inscriptos en la temporada (`season_teams`), para armar fixture.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ leagueId: string; seasonId: string }> },
) {
  try {
    const { leagueId, seasonId } = await context.params;
    if (!leagueId || !seasonId) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const appUser = await syncAppUserFromSupabaseAuthUser(user);
    const result = await listSeasonTeamsForScheduling({
      actorUserId: appUser.id,
      leagueId,
      seasonId,
    });

    if (!result.ok) {
      if (result.reason === "forbidden") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      return NextResponse.json({ error: "Temporada no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ teams: result.teams });
  } catch (e) {
    console.error("[GET /api/leagues/.../seasons/.../teams]", e);
    return NextResponse.json({ error: "No se pudieron cargar los equipos" }, { status: 500 });
  }
}
