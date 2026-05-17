import { NextResponse } from "next/server";

import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import {
  listOwnedTeamDashboardRowsPage,
  parseOwnedTeamsCursor,
} from "@/logic/leagues/list-owned-team-dashboard-rows";
import { createClient } from "@/lib/supabase/server";

/**
 * GET — siguiente página de equipos (misma heurística de temporada que `/api/leagues/my`).
 * Query: `cursor` (base64url devuelto en `teamsNextCursor`).
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const cursorRaw = url.searchParams.get("cursor");
    if (cursorRaw && parseOwnedTeamsCursor(cursorRaw) == null) {
      return NextResponse.json({ error: "Cursor inválido" }, { status: 400 });
    }

    const appUser = await syncAppUserFromSupabaseAuthUser(user);
    const page = await listOwnedTeamDashboardRowsPage(appUser.id, {
      cursor: cursorRaw,
    });

    return NextResponse.json({
      teams: page.rows,
      nextCursor: page.nextCursor,
    });
  } catch (e) {
    console.error("[GET /api/leagues/my/teams]", e);
    return NextResponse.json(
      { error: "No se pudieron cargar los equipos" },
      { status: 500 },
    );
  }
}
