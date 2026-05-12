import { NextResponse } from "next/server";

import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import { listOwnedLeaguesForAppUserId } from "@/logic/leagues/list-owned-leagues";
import { createClient } from "@/lib/supabase/server";

/**
 * GET — ligas de las que el usuario autenticado es propietario.
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
    const leagues = await listOwnedLeaguesForAppUserId(appUser.id);

    return NextResponse.json({ leagues });
  } catch (e) {
    console.error("[GET /api/leagues/my]", e);
    return NextResponse.json(
      { error: "No se pudieron cargar las ligas" },
      { status: 500 },
    );
  }
}
