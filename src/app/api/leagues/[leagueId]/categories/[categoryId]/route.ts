import { NextResponse } from "next/server";

import { newLeagueCategoryJsonSchema } from "@/components/dashboard/leagues/new-league-category-form-schema";
import { AppAuditEntityType, recordAppAuditLog } from "@/logic/audit";
import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import { getLeagueCategoryForOwnerEdit } from "@/logic/leagues/get-league-category-for-owner-edit";
import { updateLeagueCategoryForOwner } from "@/logic/leagues/update-league-category-for-owner";
import { createClient } from "@/lib/supabase/server";

/**
 * GET — categoría para edición (solo dueño o admin del panel).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ leagueId: string; categoryId: string }> },
) {
  try {
    const { leagueId, categoryId } = await context.params;
    if (!leagueId || !categoryId) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const appUser = await syncAppUserFromSupabaseAuthUser(user);
    const result = await getLeagueCategoryForOwnerEdit(appUser.id, leagueId, categoryId);

    if (result === "FORBIDDEN") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }
    if (result === "NOT_FOUND") {
      return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET .../categories/[categoryId]]", e);
    return NextResponse.json({ error: "No se pudo cargar la categoría." }, { status: 500 });
  }
}

/**
 * PATCH — actualizar nombre, género y reglas en metadata (no `code` ni `league_id`).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ leagueId: string; categoryId: string }> },
) {
  try {
    const { leagueId, categoryId } = await context.params;
    if (!leagueId || !categoryId) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
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

    const updated = await updateLeagueCategoryForOwner({
      ownerUserId: appUser.id,
      leagueId,
      categoryId,
      fields: payload,
    });

    if (updated === "FORBIDDEN") {
      return NextResponse.json({ error: "No tenés permiso para esta liga." }, { status: 403 });
    }
    if (updated === "NOT_FOUND") {
      return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
    }

    await recordAppAuditLog(
      {
        actorUserId: appUser.id,
        action: "update",
        entityType: AppAuditEntityType.leagueCategory,
        entityId: categoryId,
        leagueId,
        summary: `Categoría actualizada: ${updated.name}`,
        metadata: {
          code: updated.code,
          gender: updated.gender,
        },
      },
      { swallowErrors: true },
    );

    return NextResponse.json({ category: updated });
  } catch (e) {
    console.error("[PATCH .../categories/[categoryId]]", e);
    return NextResponse.json({ error: "No se pudo actualizar la categoría." }, { status: 500 });
  }
}
