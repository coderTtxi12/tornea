import { NextResponse } from "next/server";

import {
  PLAYER_CURP_MAX_FILE_BYTES,
  PLAYER_CURP_MIME_TYPES,
  PLAYER_PHOTO_MAX_FILE_BYTES,
  PLAYER_PHOTO_MIME_TYPES,
} from "@/components/dashboard/leagues/new-player-file-constraints";
import {
  buildOptionalPlayerWhatsappE164,
  newPlayerFormFieldsSchema,
  parseOptionalShirtNumber,
} from "@/components/dashboard/leagues/new-player-form-schema";
import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import {
  createPlayerInTeam,
  deletePlayerById,
  mergePlayerMetadata,
} from "@/logic/players/create-player-in-team";
import { tryRemovePlayerFiles, uploadPlayerFile } from "@/logic/players/upload-player-files";
import { leagueShieldStorageBucket } from "@/logic/leagues/upload-league-shield";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function readFormString(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
}

/**
 * POST — alta de jugador en un equipo (`players` + `team_rosters`).
 * Multipart: campos de texto + archivos opcionales `photo` y `curp`.
 *
 * Solo el dueño de la liga puede agregar jugadores. Si la subida de un archivo falla,
 * se hace rollback del jugador (DELETE cascadeará team_rosters).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ leagueId: string; teamId: string }> },
) {
  try {
    const { leagueId, teamId } = await context.params;
    if (!leagueId || !teamId) {
      return NextResponse.json({ error: "Liga o equipo no válidos." }, { status: 400 });
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

    const parsed = newPlayerFormFieldsSchema.safeParse({
      teamId,
      leagueId,
      fullName: readFormString(form, "fullName"),
      shirtNumber: readFormString(form, "shirtNumber"),
      position: readFormString(form, "position"),
      whatsappCountryIso: readFormString(form, "whatsappCountryIso") || "MX",
      whatsappPhoneNational: readFormString(form, "whatsappPhoneNational"),
    });
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const seg = issue.path[0];
        if (typeof seg === "string" && fields[seg] === undefined) {
          fields[seg] = issue.message;
        }
      }
      return NextResponse.json({ error: "Validación", fields }, { status: 400 });
    }

    const data = parsed.data;
    const whatsappE164 = buildOptionalPlayerWhatsappE164(
      data.whatsappCountryIso,
      data.whatsappPhoneNational,
    );

    let created: { playerId: string; seasonId: string; teamRosterId: string };
    try {
      created = await createPlayerInTeam({
        ownerUserId: appUser.id,
        leagueId,
        teamId,
        fullName: data.fullName,
        shirtNumber: parseOptionalShirtNumber(data.shirtNumber),
        position: data.position ?? null,
        whatsappE164,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "No tenés permiso para esta liga." },
          { status: 403 },
        );
      }
      if (e instanceof Error && e.message === "TEAM_NOT_FOUND") {
        return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
      }
      if (e instanceof Error && e.message === "TEAM_LEAGUE_MISMATCH") {
        return NextResponse.json(
          { error: "El equipo no pertenece a esta liga." },
          { status: 400 },
        );
      }
      throw e;
    }

    const photoEntry = form.get("photo");
    const curpEntry = form.get("curp");

    const filesToUpload: Array<{ kind: "photo" | "curp"; file: File }> = [];
    if (photoEntry instanceof File && photoEntry.size > 0) {
      if (photoEntry.size > PLAYER_PHOTO_MAX_FILE_BYTES) {
        await deletePlayerById(created.playerId);
        return NextResponse.json(
          { error: "La foto del jugador supera el tamaño máximo permitido." },
          { status: 400 },
        );
      }
      if (!PLAYER_PHOTO_MIME_TYPES.has(photoEntry.type)) {
        await deletePlayerById(created.playerId);
        return NextResponse.json(
          { error: "La foto debe ser JPG, PNG o WebP." },
          { status: 400 },
        );
      }
      filesToUpload.push({ kind: "photo", file: photoEntry });
    }
    if (curpEntry instanceof File && curpEntry.size > 0) {
      if (curpEntry.size > PLAYER_CURP_MAX_FILE_BYTES) {
        await deletePlayerById(created.playerId);
        return NextResponse.json(
          { error: "El archivo de CURP supera el tamaño máximo permitido." },
          { status: 400 },
        );
      }
      if (!PLAYER_CURP_MIME_TYPES.has(curpEntry.type)) {
        await deletePlayerById(created.playerId);
        return NextResponse.json(
          { error: "La CURP debe ser PDF, JPG, PNG o WebP." },
          { status: 400 },
        );
      }
      filesToUpload.push({ kind: "curp", file: curpEntry });
    }

    if (filesToUpload.length > 0) {
      const bucket = leagueShieldStorageBucket();
      const service = createServiceRoleClient();
      const storageClient = service ?? supabase;

      const uploadedPaths: string[] = [];
      const metadataPatch: Record<string, unknown> = {};

      try {
        for (const item of filesToUpload) {
          const bytes = new Uint8Array(await item.file.arrayBuffer());
          const ref = await uploadPlayerFile(storageClient, {
            bucket,
            ownerUserId: appUser.id,
            playerId: created.playerId,
            kind: item.kind,
            bytes,
            contentType: item.file.type,
          });
          uploadedPaths.push(ref.path);
          metadataPatch[item.kind] = ref;
        }

        await mergePlayerMetadata(created.playerId, metadataPatch);
      } catch (err) {
        console.error(
          "[POST /api/leagues/[leagueId]/teams/[teamId]/players] file upload",
          err,
        );
        await tryRemovePlayerFiles(storageClient, bucket, uploadedPaths);
        await deletePlayerById(created.playerId);
        return NextResponse.json(
          {
            error:
              "No se pudo guardar el archivo en Storage. El jugador no se guardó. Revisa el bucket o la clave de servicio.",
          },
          { status: 503 },
        );
      }
    }

    return NextResponse.json(
      { player: { id: created.playerId } },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/leagues/[leagueId]/teams/[teamId]/players]", e);
    return NextResponse.json({ error: "No se pudo agregar al jugador." }, { status: 500 });
  }
}
