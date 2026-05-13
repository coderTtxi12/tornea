import { NextResponse } from "next/server";

import {
  LEAGUE_SHIELD_MAX_FILE_BYTES,
  LEAGUE_SHIELD_MIME_TYPES,
} from "@/components/dashboard/leagues/league-shield-constraints";
import {
  buildWhatsappE164,
  newTeamFormFieldsSchema,
  teamStatusEnumSchema,
} from "@/components/dashboard/leagues/new-team-form-schema";
import { getDb } from "@/db/client";
import { AppAuditEntityType, recordAppAuditLog } from "@/logic/audit";
import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import { getLeagueOwnerUserId } from "@/logic/leagues/league-dashboard-admin";
import { getTeamForOwnerEdit } from "@/logic/leagues/get-team-for-owner-edit";
import { resolveSupabaseStorageUrlForImgDisplay } from "@/logic/leagues/resolve-supabase-storage-url-for-img-display";
import {
  leagueShieldStorageBucket,
  uploadTeamCrestAndSetUrl,
} from "@/logic/leagues/upload-team-crest";
import { updateTeamForOwner } from "@/logic/leagues/update-team-for-owner";
import type { TeamRegistrationContacts } from "@/logic/leagues/create-team-in-league";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function readFormString(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
}

/**
 * GET — equipo + inscripción y contactos para edición (solo dueño de la liga).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ leagueId: string; teamId: string }> },
) {
  try {
    const { leagueId, teamId } = await context.params;
    if (!leagueId || !teamId) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const appUser = await syncAppUserFromSupabaseAuthUser(user);
    const result = await getTeamForOwnerEdit(appUser.id, leagueId, teamId);

    if (result === "FORBIDDEN") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }
    if (result === "NOT_FOUND") {
      return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    }

    const crestDisplayUrl = await resolveSupabaseStorageUrlForImgDisplay(result.team.crestUrl);

    return NextResponse.json({
      ...result,
      team: {
        ...result.team,
        crestUrl: crestDisplayUrl,
      },
    });
  } catch (e) {
    console.error("[GET /api/leagues/[leagueId]/teams/[teamId]]", e);
    return NextResponse.json({ error: "No se pudo cargar el equipo." }, { status: 500 });
  }
}

/**
 * PATCH — actualizar equipo e inscripción (multipart opcional `crest`).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ leagueId: string; teamId: string }> },
) {
  try {
    const { leagueId, teamId } = await context.params;
    if (!leagueId || !teamId) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const appUser = await syncAppUserFromSupabaseAuthUser(user);
    const form = await request.formData();

    const parsedFields = newTeamFormFieldsSchema.safeParse({
      teamName: readFormString(form, "teamName"),
      leagueCategoryId: readFormString(form, "leagueCategoryId"),
      directorName: readFormString(form, "directorName"),
      directorEmail: readFormString(form, "directorEmail"),
      directorCountryIso: readFormString(form, "directorCountryIso"),
      directorPhoneNational: readFormString(form, "directorPhoneNational"),
      additionalName: readFormString(form, "additionalName"),
      additionalEmail: readFormString(form, "additionalEmail"),
      additionalCountryIso: readFormString(form, "additionalCountryIso"),
      additionalPhoneNational: readFormString(form, "additionalPhoneNational"),
    });

    const parsedStatus = teamStatusEnumSchema.safeParse(readFormString(form, "teamStatus"));

    if (!parsedFields.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsedFields.error.issues) {
        const seg = issue.path[0];
        if (typeof seg === "string" && errors[seg] === undefined) {
          errors[seg] = issue.message;
        }
      }
      return NextResponse.json({ error: "Validación", fields: errors }, { status: 400 });
    }

    if (!parsedStatus.success) {
      return NextResponse.json(
        { error: "Validación", fields: { teamStatus: "Estado no válido." } },
        { status: 400 },
      );
    }

    const d = parsedFields.data;
    const contacts: TeamRegistrationContacts = {
      director: {
        fullName: d.directorName.trim(),
        email: d.directorEmail.trim() ? d.directorEmail.trim().toLowerCase() : null,
        whatsappE164: buildWhatsappE164(d.directorCountryIso, d.directorPhoneNational),
      },
      additional: {
        fullName: d.additionalName.trim(),
        email: d.additionalEmail.trim() ? d.additionalEmail.trim().toLowerCase() : null,
        whatsappE164: buildWhatsappE164(d.additionalCountryIso, d.additionalPhoneNational),
      },
    };

    try {
      await updateTeamForOwner({
        ownerUserId: appUser.id,
        leagueId,
        teamId,
        teamName: d.teamName,
        teamStatus: parsedStatus.data,
        leagueCategoryId: d.leagueCategoryId,
        contacts,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "FORBIDDEN") {
        return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
      }
      if (e instanceof Error && e.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
      }
      if (e instanceof Error && e.message === "BAD_CATEGORY") {
        return NextResponse.json({ error: "La categoría no pertenece a esta liga." }, { status: 400 });
      }
      if (e instanceof Error && e.message === "DUPLICATE_TEAM_NAME") {
        return NextResponse.json(
          {
            error: "Ya existe otro equipo con ese nombre en la liga.",
            fields: { teamName: "Elegí otro nombre (único por liga)." },
          },
          { status: 409 },
        );
      }
      throw e;
    }

    const teamNameTrim = d.teamName.trim();
    await recordAppAuditLog(
      {
        actorUserId: appUser.id,
        action: "update",
        entityType: AppAuditEntityType.team,
        entityId: teamId,
        leagueId,
        summary: `Equipo actualizado: ${teamNameTrim}`,
        metadata: {
          teamStatus: parsedStatus.data,
          leagueCategoryId: d.leagueCategoryId,
        },
      },
      { swallowErrors: true },
    );

    const crestEntry = form.get("crest");
    if (crestEntry instanceof File && crestEntry.size > 0) {
      if (crestEntry.size > LEAGUE_SHIELD_MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "El escudo supera el tamaño máximo permitido." },
          { status: 400 },
        );
      }
      const ct = crestEntry.type;
      if (!LEAGUE_SHIELD_MIME_TYPES.has(ct)) {
        return NextResponse.json(
          { error: "El escudo debe ser JPG, PNG o WebP." },
          { status: 400 },
        );
      }
      const bytes = new Uint8Array(await crestEntry.arrayBuffer());
      const bucket = leagueShieldStorageBucket();
      const service = createServiceRoleClient();
      const storageClient = service ?? supabase;
      const storageOwner = await getLeagueOwnerUserId(getDb(), leagueId);
      if (!storageOwner) {
        return NextResponse.json({ error: "Liga no encontrada." }, { status: 404 });
      }
      try {
        await uploadTeamCrestAndSetUrl(storageClient, {
          bucket,
          ownerUserId: storageOwner,
          leagueId,
          teamId,
          bytes,
          contentType: ct,
        });
        await recordAppAuditLog(
          {
            actorUserId: appUser.id,
            action: "update",
            entityType: AppAuditEntityType.team,
            entityId: teamId,
            leagueId,
            summary: `Escudo del equipo actualizado: ${teamNameTrim}`,
            metadata: { subAction: "team_crest" },
          },
          { swallowErrors: true },
        );
      } catch (err) {
        console.error("[PATCH .../teams/[teamId]] crest upload", err);
        return NextResponse.json(
          {
            error:
              "Los datos del equipo se guardaron, pero no se pudo subir el escudo. Intentá subirlo de nuevo.",
          },
          { status: 503 },
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/leagues/[leagueId]/teams/[teamId]]", e);
    return NextResponse.json({ error: "No se pudo actualizar el equipo." }, { status: 500 });
  }
}
