import { NextResponse } from "next/server";

import { requireAppUser, validationErrorFromZod } from "@/lib/api";
import {
  matchOpsParams,
  opsBadRequest,
  opsForbidden,
  opsNotFound,
} from "@/lib/api/match-operations-route";

import { tickMatchClock } from "@/logic/match-operations/tick-match-clock";
import { clockSchema } from "@/schemas/match-operations/schemas";

export async function POST(
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

    const parsed = clockSchema.safeParse(body);
    if (!parsed.success) return validationErrorFromZod(parsed.error);

    const result = await tickMatchClock(
      auth.ctx.appUser.id,
      params.leagueId,
      params.matchId,
      parsed.data.action,
      parsed.data.action === "add_stoppage"
        ? { stoppageMinutes: parsed.data.minutes }
        : undefined,
    );

    if (!result.ok) {
      if (result.reason === "forbidden") return opsForbidden();
      if (result.reason === "not_found") return opsNotFound();
      if (result.reason === "invalid_stoppage") {
        return opsBadRequest(
          "Solo puedes añadir tiempo extra en el 2.º tiempo cuando el reloj está cerca del límite.",
        );
      }
      if (result.reason === "not_second_half") {
        return opsBadRequest("El tiempo extra solo aplica en el 2.º tiempo.");
      }
      return opsBadRequest("El cronómetro solo está disponible con el partido en vivo.");
    }

    return NextResponse.json({ ok: true, period: result.period });
  } catch (e) {
    console.error("[POST clock]", e);
    return NextResponse.json({ error: "Error de cronómetro" }, { status: 500 });
  }
}
