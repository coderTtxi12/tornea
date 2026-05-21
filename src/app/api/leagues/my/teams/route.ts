import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/api";
import {
  listOwnedTeamDashboardRowsPage,
  parseOwnedTeamsCursor,
} from "@/logic/leagues/list-owned-team-dashboard-rows";

/**
 * GET — siguiente página de equipos (misma heurística de temporada que `/api/leagues/my`).
 * Query: `cursor` (base64url devuelto en `teamsNextCursor`).
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const cursorRaw = url.searchParams.get("cursor");
    if (cursorRaw && parseOwnedTeamsCursor(cursorRaw) == null) {
      return NextResponse.json({ error: "Cursor inválido" }, { status: 400 });
    }

    const { appUser } = auth.ctx;
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
