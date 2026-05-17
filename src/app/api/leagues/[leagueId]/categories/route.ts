import { NextResponse } from "next/server";

import { newLeagueCategoryJsonSchema } from "@/components/dashboard/leagues/new-league-category-form-schema";
import { AppAuditEntityType, recordAppAuditLog } from "@/logic/audit";
import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import { createLeagueCategoryWithIdempotency } from "@/logic/leagues/create-league-category-with-idempotency";
import { createClient } from "@/lib/supabase/server";

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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let bodyJson: unknown;
    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = newLeagueCategoryJsonSchema.safeParse(bodyJson);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && fields[key] === undefined) {
          fields[key] = issue.message;
        }
      }
      return NextResponse.json(
        { error: "Revisá los datos del formulario.", fields },
        { status: 400 },
      );
    }

    const appUser = await syncAppUserFromSupabaseAuthUser(user);

    const payload = {
      name: parsed.data.name,
      gender: parsed.data.gender,
      birthYearMin: parsed.data.birthYearMin ?? null,
      birthYearMax: parsed.data.birthYearMax ?? null,
      minTeamsToStart: parsed.data.minTeamsToStart ?? null,
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
