import { NextResponse } from "next/server";

import { requireAppUser, validationErrorFromZod } from "@/lib/api";
import { newLeagueCategoryJsonSchema } from "@/schemas/dashboard/new-league-category-form-schema";
import { AppAuditEntityType, recordAppAuditLog } from "@/logic/audit";
import { createLeagueCategoryWithIdempotency } from "@/logic/leagues/create-league-category-with-idempotency";

function readIdempotencyKey(request: Request): string | null {
  const raw =
    request.headers.get("idempotency-key") ?? request.headers.get("Idempotency-Key");
  if (!raw) return null;
  const key = raw.trim();
  if (key.length < 8 || key.length > 200) return null;
  return key;
}

/**
 * POST — crear categoría (`league_categories`) para una liga del dueño.
 * Header `Idempotency-Key` obligatorio (8–200 caracteres). Body JSON.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ leagueId: string }> },
) {
  try {
    const { leagueId } = await context.params;
    if (!leagueId || typeof leagueId !== "string") {
      return NextResponse.json({ error: "Liga no válida" }, { status: 400 });
    }

    const idempotencyKey = readIdempotencyKey(request);
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Enviá un header Idempotency-Key (8–200 caracteres)." },
        { status: 400 },
      );
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;

    let bodyJson: unknown;
    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = newLeagueCategoryJsonSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return validationErrorFromZod(parsed.error);
    }

    const payload = {
      name: parsed.data.name,
      gender: parsed.data.gender,
      birthYearMin: parsed.data.birthYearMin ?? null,
      birthYearMax: parsed.data.birthYearMax ?? null,
      minTeamsToStart: parsed.data.minTeamsToStart ?? null,
      playersOnFieldPerTeam: parsed.data.playersOnFieldPerTeam ?? null,
      firstHalfMinutes: parsed.data.firstHalfMinutes,
      halftimeBreakMinutes: parsed.data.halftimeBreakMinutes,
      secondHalfMinutes: parsed.data.secondHalfMinutes,
    };

    const result = await createLeagueCategoryWithIdempotency(
      appUser.id,
      leagueId,
      idempotencyKey,
      payload,
    );

    if (!result.replay) {
      await recordAppAuditLog(
        {
          actorUserId: appUser.id,
          action: "create",
          entityType: AppAuditEntityType.leagueCategory,
          entityId: result.category.id,
          leagueId,
          summary: `Categoría creada: ${result.category.name}`,
          metadata: {
            code: result.category.code,
            gender: result.category.gender,
          },
        },
        { swallowErrors: true },
      );
    }

    return NextResponse.json(
      { category: result.category, replay: result.replay },
      { status: result.replay ? 200 : 201 },
    );
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "No tenés permiso para esta liga." }, { status: 403 });
    }
    if (e instanceof Error && e.message.startsWith("Inconsistencia:")) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error("[POST /api/leagues/[leagueId]/categories]", e);
    return NextResponse.json({ error: "No se pudo crear la categoría." }, { status: 500 });
  }
}
