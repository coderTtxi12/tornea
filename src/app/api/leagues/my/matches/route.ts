import { NextResponse } from "next/server";

import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import { listOwnedMatchDashboardAll } from "@/logic/leagues/list-owned-match-dashboard-rows";
import { createClient } from "@/lib/supabase/server";

/**
 * GET — todos los partidos de ligas gestionadas.
 * Filtros, orden y paginación del fixture se resuelven en el cliente.
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
    const matches = await listOwnedMatchDashboardAll(appUser.id);

    return NextResponse.json({ matches });
  } catch (e) {
    console.error("[GET /api/leagues/my/matches]", e);
    return NextResponse.json({ error: "No se pudieron cargar los partidos" }, { status: 500 });
  }
}
