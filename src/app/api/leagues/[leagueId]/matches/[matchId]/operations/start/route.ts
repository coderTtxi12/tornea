import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/api";
import {
  matchOpsParams,
  opsBadRequest,
  opsForbidden,
  opsNotFound,
} from "@/lib/api/match-operations-route";

import { startMatchLive } from "@/logic/match-operations/start-match-live";

export async function POST(
  _request: Request,
  context: { params: Promise<{ leagueId: string; matchId: string }> },
) {
  try {
    const params = await matchOpsParams(context);
    if (!params) {
      return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 });
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;

    const result = await startMatchLive(
      auth.ctx.appUser.id,
      params.leagueId,
      params.matchId,
    );

    if (!result.ok) {
      if (result.reason === "forbidden") return opsForbidden();
      if (result.reason === "not_found") return opsNotFound();
      return opsBadRequest("Valida la plantilla antes de iniciar el partido.");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST start match]", e);
    return NextResponse.json({ error: "Error al iniciar" }, { status: 500 });
  }
}
