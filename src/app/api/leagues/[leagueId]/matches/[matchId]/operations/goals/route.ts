import { NextResponse } from "next/server";

import { requireAppUser, validationErrorFromZod } from "@/lib/api";
import {
  matchOpsParams,
  opsBadRequest,
  opsForbidden,
  opsNotFound,
} from "@/lib/api/match-operations-route";

import { recordMatchGoal } from "@/logic/match-operations/record-match-goal";
import { goalSchema } from "@/schemas/match-operations/schemas";

export async function POST(
  request: Request,
  context: { params: Promise<{ leagueId: string; matchId: string }> },
) {
  try {
    const params = await matchOpsParams(context);
    if (!params) return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 });

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;

    const parsed = goalSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationErrorFromZod(parsed.error);

    const result = await recordMatchGoal({
      actorUserId: auth.ctx.appUser.id,
      leagueId: params.leagueId,
      matchId: params.matchId,
      ...parsed.data,
    });

    if (!result.ok) {
      if (result.reason === "forbidden") return opsForbidden();
      if (result.reason === "not_found") return opsNotFound();
      return opsBadRequest("No se pudo registrar el gol.");
    }

    return NextResponse.json({ ok: true, goalId: result.goalId });
  } catch (e) {
    console.error("[POST goal]", e);
    return NextResponse.json({ error: "Error al registrar gol" }, { status: 500 });
  }
}
