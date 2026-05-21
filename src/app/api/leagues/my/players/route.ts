import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/api";
import {
  listOwnedPlayerDashboardRowsPage,
  parseOwnedPlayersCursor,
} from "@/logic/leagues/list-owned-player-dashboard-rows";

/**
 * GET — siguiente página de jugadores en plantilla (misma temporada objetivo que `/api/leagues/my`).
 * Query: `cursor` (base64url devuelto en `playersNextCursor`).
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const cursorRaw = url.searchParams.get("cursor");
    if (cursorRaw && parseOwnedPlayersCursor(cursorRaw) == null) {
      return NextResponse.json({ error: "Cursor inválido" }, { status: 400 });
    }

    const { appUser } = auth.ctx;
    const page = await listOwnedPlayerDashboardRowsPage(appUser.id, {
      cursor: cursorRaw,
    });

    return NextResponse.json({
      players: page.rows,
      nextCursor: page.nextCursor,
    });
  } catch (e) {
    console.error("[GET /api/leagues/my/players]", e);
    return NextResponse.json(
      { error: "No se pudieron cargar los jugadores" },
      { status: 500 },
    );
  }
}
