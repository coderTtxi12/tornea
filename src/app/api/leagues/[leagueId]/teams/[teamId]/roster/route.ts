import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/api";

import { listTeamRosterDashboardRows } from "@/logic/leagues/list-team-roster-dashboard-rows";

/**
 * GET — plantilla del equipo en la temporada objetivo (`team_rosters` + `players`).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ leagueId: string; teamId: string }> },
) {
  try {
    const { leagueId, teamId } = await context.params;
    if (!leagueId || !teamId) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;
    const result = await listTeamRosterDashboardRows(appUser.id, leagueId, teamId);

    if (result === "FORBIDDEN") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }
    if (result === "NOT_FOUND") {
      return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ roster: result });
  } catch (e) {
    console.error("[GET .../teams/[teamId]/roster]", e);
    return NextResponse.json({ error: "No se pudo cargar la plantilla." }, { status: 500 });
  }
}
