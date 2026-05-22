import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAppUser, validationErrorFromZod } from "@/lib/api";
import {
  matchOpsParams,
  opsBadRequest,
  opsForbidden,
  opsNotFound,
} from "@/lib/api/match-operations-route";

import { addExpressRosterPlayer } from "@/logic/match-operations/add-express-roster-player";
import { validateBirthDateIso } from "@/logic/players/birth-date-validation";

const schema = z
  .object({
    teamId: z.string().uuid(),
    fullName: z.string().trim().min(2).max(120),
    birthDate: z.string().trim().min(1),
    shirtNumber: z.number().int().min(0).max(99).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const message = validateBirthDateIso(data.birthDate);
    if (message) {
      ctx.addIssue({ code: "custom", message, path: ["birthDate"] });
    }
  });

export async function POST(
  request: Request,
  context: { params: Promise<{ leagueId: string; matchId: string }> },
) {
  try {
    const params = await matchOpsParams(context);
    if (!params) return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 });

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationErrorFromZod(parsed.error);

    const result = await addExpressRosterPlayer({
      actorUserId: auth.ctx.appUser.id,
      leagueId: params.leagueId,
      matchId: params.matchId,
      ...parsed.data,
    });

    if (!result.ok) {
      if (result.reason === "forbidden") return opsForbidden();
      if (result.reason === "not_found") return opsNotFound();
      return opsBadRequest("No se pudo dar de alta al jugador.");
    }

    return NextResponse.json({ ok: true, playerId: result.playerId });
  } catch (e) {
    console.error("[POST express-player]", e);
    return NextResponse.json({ error: "Error al crear jugador" }, { status: 500 });
  }
}
