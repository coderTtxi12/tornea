import { NextResponse } from "next/server";

export function matchOpsParams(
  context: { params: Promise<{ leagueId: string; matchId: string }> },
): Promise<{ leagueId: string; matchId: string } | null> {
  return context.params.then((p) => {
    if (!p.leagueId || !p.matchId) return null;
    return { leagueId: p.leagueId, matchId: p.matchId };
  });
}

export function opsForbidden() {
  return NextResponse.json({ error: "No autorizado" }, { status: 403 });
}

export function opsNotFound() {
  return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
}

export function opsBadRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
