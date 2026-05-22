import { NextResponse } from "next/server";

import { requireAppUser, validationErrorFromZod } from "@/lib/api";
import {
  matchOpsParams,
  opsBadRequest,
  opsForbidden,
  opsNotFound,
} from "@/lib/api/match-operations-route";

import { finishMatch } from "@/logic/match-operations/finish-match";
import { finishSchema } from "@/schemas/match-operations/schemas";

export async function POST(
  request: Request,
  context: { params: Promise<{ leagueId: string; matchId: string }> },
) {
  try {
    const params = await matchOpsParams(context);
    if (!params) return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 });

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;

    const parsed = finishSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationErrorFromZod(parsed.error);

    const mode =
      parsed.data.type === "played"
        ? {
            type: "played" as const,
            homeScore: parsed.data.homeScore,
            awayScore: parsed.data.awayScore,
            notes: parsed.data.notes,
          }
        : parsed.data.type === "walkover_home"
          ? { type: "walkover_home" as const, notes: parsed.data.notes }
          : parsed.data.type === "walkover_away"
            ? { type: "walkover_away" as const, notes: parsed.data.notes }
            : { type: "both_no_show" as const, notes: parsed.data.notes };

    const result = await finishMatch({
      actorUserId: auth.ctx.appUser.id,
      leagueId: params.leagueId,
      matchId: params.matchId,
      mode,
    });

    if (!result.ok) {
      if (result.reason === "forbidden") return opsForbidden();
      if (result.reason === "not_found") return opsNotFound();
      if (result.reason === "score_mismatch") {
        return opsBadRequest(
          "El marcador no coincide con los goles registrados. Añade una nota para confirmar.",
        );
      }
      return opsBadRequest("No se pudo finalizar el partido.");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST finish]", e);
    return NextResponse.json({ error: "Error al finalizar" }, { status: 500 });
  }
}
