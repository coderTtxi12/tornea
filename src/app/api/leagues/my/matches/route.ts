import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/api";

import { listOwnedMatchDashboardAll } from "@/logic/leagues/list-owned-match-dashboard-rows";

/**
 * GET — todos los partidos de ligas gestionadas.
 * Filtros, orden y paginación del fixture se resuelven en el cliente.
 */
export async function GET() {
  try {
    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;
    const matches = await listOwnedMatchDashboardAll(appUser.id);

    return NextResponse.json({ matches });
  } catch (e) {
    console.error("[GET /api/leagues/my/matches]", e);
    return NextResponse.json({ error: "No se pudieron cargar los partidos" }, { status: 500 });
  }
}
