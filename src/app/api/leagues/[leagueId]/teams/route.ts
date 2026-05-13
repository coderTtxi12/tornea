import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  LEAGUE_SHIELD_MAX_FILE_BYTES,
  LEAGUE_SHIELD_MIME_TYPES,
} from "@/components/dashboard/leagues/league-shield-constraints";
import {
  buildWhatsappE164,
  newTeamFormFieldsSchema,
} from "@/components/dashboard/leagues/new-team-form-schema";
import { getDb } from "@/db/client";
import { teams } from "@/db/schema";
import { AppAuditEntityType, recordAppAuditLog } from "@/logic/audit";
import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import { createTeamInLeague, type TeamRegistrationContacts } from "@/logic/leagues/create-team-in-league";
import {
  leagueShieldStorageBucket,
  uploadTeamCrestAndSetUrl,
} from "@/logic/leagues/upload-team-crest";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function readFormString(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
}

/**
 * POST — registrar equipo en una liga del dueño (`teams` + `season_teams` con categoría y contactos en metadata).
 * Multipart: campos de texto + archivo opcional `crest`.
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

    let created: {
      teamId: string;
      seasonId: string;
      seasonTeamId: string;
      leagueOwnerUserId: string;
    };
    try {
      created = await createTeamInLeague({
        ownerUserId: appUser.id,
        leagueId,
        leagueCategoryId: d.leagueCategoryId,
        teamName: d.teamName,
        contacts,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Liga no encontrada." }, { status: 404 });
      }
      if (e instanceof Error && e.message === "FORBIDDEN") {
        return NextResponse.json({ error: "No tenés permiso para esta liga." }, { status: 403 });
      }
      if (e instanceof Error && e.message === "BAD_CATEGORY") {
        return NextResponse.json(
          { error: "La categoría no pertenece a esta liga." },
          { status: 400 },
        );
      }
      if (e instanceof Error && e.message === "DUPLICATE_TEAM_NAME") {
        return NextResponse.json(
          {
            error: "Ya existe un equipo con ese nombre en la liga.",
            fields: { teamName: "Elegí otro nombre (único por liga)." },
          },
          { status: 409 },
        );
      }
      throw e;
    }

    const crestEntry = form.get("crest");
    if (crestEntry instanceof File && crestEntry.size > 0) {
      if (crestEntry.size > LEAGUE_SHIELD_MAX_FILE_BYTES) {
        const db = getDb();
        await db.delete(teams).where(eq(teams.id, created.teamId));
        return NextResponse.json(
          { error: "El escudo supera el tamaño máximo permitido." },
          { status: 400 },
        );
      }
      const ct = crestEntry.type;
      if (!LEAGUE_SHIELD_MIME_TYPES.has(ct)) {
        const db = getDb();
        await db.delete(teams).where(eq(teams.id, created.teamId));
        return NextResponse.json(
          { error: "El escudo debe ser JPG, PNG o WebP." },
          { status: 400 },
        );
      }
      const bytes = new Uint8Array(await crestEntry.arrayBuffer());
      const bucket = leagueShieldStorageBucket();
      const service = createServiceRoleClient();
      const storageClient = service ?? supabase;
      try {
        await uploadTeamCrestAndSetUrl(storageClient, {
          bucket,
          ownerUserId: created.leagueOwnerUserId,
          leagueId,
          teamId: created.teamId,
          bytes,
          contentType: ct,
        });
      } catch (err) {
        console.error("[POST /api/leagues/[leagueId]/teams] crest upload", err);
        const db = getDb();
        await db.delete(teams).where(eq(teams.id, created.teamId));
        return NextResponse.json(
          {
            error:
              "No se pudo guardar el escudo en Storage. El equipo no se guardó. Revisá el bucket o la clave de servicio.",
          },
          { status: 503 },
        );
      }
    }

    const crestUploaded =
      crestEntry instanceof File && crestEntry.size > 0;
    await recordAppAuditLog(
      {
        actorUserId: appUser.id,
        action: "create",
        entityType: AppAuditEntityType.team,
        entityId: created.teamId,
        leagueId,
        summary: `Equipo registrado: ${d.teamName.trim()}`,
        metadata: {
          seasonId: created.seasonId,
          seasonTeamId: created.seasonTeamId,
          leagueCategoryId: d.leagueCategoryId,
          crestUploaded,
        },
      },
      { swallowErrors: true },
    );

    return NextResponse.json(
      {
        team: {
          id: created.teamId,
          seasonId: created.seasonId,
          seasonTeamId: created.seasonTeamId,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/leagues/[leagueId]/teams]", e);
    return NextResponse.json({ error: "No se pudo registrar el equipo." }, { status: 500 });
  }
}
