import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/api";
import {
  matchOpsParams,
  opsForbidden,
  opsNotFound,
} from "@/lib/api/match-operations-route";

import { getMatchOperationsBundle } from "@/logic/match-operations/get-match-operations-bundle";

export async function GET(
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

    const result = await getMatchOperationsBundle(
      auth.ctx.appUser.id,
      params.leagueId,
      params.matchId,
    );

    if (!result.ok) {
      if (result.reason === "forbidden") return opsForbidden();
      return opsNotFound();
    }

    return NextResponse.json(result.bundle);
  } catch (e) {
    console.error("[GET match operations]", e);
    return NextResponse.json({ error: "Error al cargar el partido" }, { status: 500 });
  }
}
