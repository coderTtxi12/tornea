import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/api";

import { getPlayerDashboardSheet } from "@/logic/players/get-player-dashboard-sheet";

/**
 * GET — ficha técnica del jugador + estadísticas en la liga (solo dueño).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ leagueId: string; teamId: string; playerId: string }> },
) {
  try {
    const { leagueId, teamId, playerId } = await context.params;
    if (!leagueId || !teamId || !playerId) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;
    const result = await getPlayerDashboardSheet(appUser.id, leagueId, teamId, playerId);

    if (result === "FORBIDDEN") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }
    if (result === "NOT_FOUND") {
      return NextResponse.json({ error: "Jugador no encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      sheet: JSON.parse(
        JSON.stringify(result, (_, value) => (typeof value === "bigint" ? Number(value) : value)),
      ),
    });
  } catch (e) {
    console.error("[GET .../players/[playerId]/sheet]", e);
    return NextResponse.json({ error: "No se pudo cargar la ficha." }, { status: 500 });
  }
}
