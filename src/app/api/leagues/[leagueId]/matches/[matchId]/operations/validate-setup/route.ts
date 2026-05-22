import { NextResponse } from "next/server";

import { requireAppUser, validationErrorFromZod } from "@/lib/api";
import {
  matchOpsParams,
  opsBadRequest,
  opsForbidden,
  opsNotFound,
} from "@/lib/api/match-operations-route";

import { validateMatchSetup } from "@/logic/match-operations/validate-match-setup";
import { validateSetupSchema } from "@/schemas/match-operations/schemas";

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

    const parsed = validateSetupSchema.safeParse(body);
    if (!parsed.success) return validationErrorFromZod(parsed.error);

    const result = await validateMatchSetup({
      actorUserId: auth.ctx.appUser.id,
      leagueId: params.leagueId,
      matchId: params.matchId,
      ...parsed.data,
    });

    if (!result.ok) {
      if (result.reason === "forbidden") return opsForbidden();
      if (result.reason === "not_found") return opsNotFound();
      return opsBadRequest("No se pudo validar el partido.");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST validate-setup]", e);
    return NextResponse.json({ error: "Error al validar" }, { status: 500 });
  }
}
