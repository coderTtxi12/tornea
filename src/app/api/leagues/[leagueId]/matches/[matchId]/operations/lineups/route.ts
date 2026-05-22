import { NextResponse } from "next/server";

import { requireAppUser, validationErrorFromZod } from "@/lib/api";
import {
  matchOpsParams,
  opsBadRequest,
  opsForbidden,
  opsNotFound,
} from "@/lib/api/match-operations-route";

import { saveMatchLineups } from "@/logic/match-operations/save-match-lineups";
import { lineupsSchema } from "@/schemas/match-operations/schemas";

const MESSAGES: Record<string, string> = {
  player_not_on_roster: "Un jugador no pertenece al plantel del equipo.",
  player_both_teams: "Un jugador no puede estar en ambos equipos.",
  too_many_starters: "Demasiados titulares para el máximo en cancha.",
  missing_starters: "Cada equipo necesita al menos un titular.",
  invalid_phase: "Completa la validación del partido primero.",
};

export async function PUT(
  request: Request,
  context: { params: Promise<{ leagueId: string; matchId: string }> },
) {
  try {
    const params = await matchOpsParams(context);
    if (!params) {
      return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 });
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = lineupsSchema.safeParse(body);
    if (!parsed.success) return validationErrorFromZod(parsed.error);

    const result = await saveMatchLineups({
      actorUserId: auth.ctx.appUser.id,
      leagueId: params.leagueId,
      matchId: params.matchId,
      entries: parsed.data.entries,
    });

    if (!result.ok) {
      if (result.reason === "forbidden") return opsForbidden();
      if (result.reason === "not_found") return opsNotFound();
      return opsBadRequest(MESSAGES[result.reason] ?? "No se pudo guardar la plantilla.");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PUT lineups]", e);
    return NextResponse.json({ error: "Error al guardar plantilla" }, { status: 500 });
  }
}
