import { NextResponse } from "next/server";

import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import { listOwnedMatchDashboardFacets } from "@/logic/leagues/list-owned-match-dashboard-facets";
import { createClient } from "@/lib/supabase/server";

/**
 * GET — valores distintos para filtros de la tabla de partidos (ligas gestionadas).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const appUser = await syncAppUserFromSupabaseAuthUser(user);
    const facets = await listOwnedMatchDashboardFacets(appUser.id);

    return NextResponse.json(facets);
  } catch (e) {
    console.error("[GET /api/leagues/my/matches/facets]", e);
    return NextResponse.json({ error: "No se pudieron cargar los filtros" }, { status: 500 });
  }
}
