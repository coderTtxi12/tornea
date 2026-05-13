import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  PLAYER_CURP_MAX_FILE_BYTES,
  PLAYER_CURP_MIME_TYPES,
  PLAYER_PHOTO_MAX_FILE_BYTES,
  PLAYER_PHOTO_MIME_TYPES,
} from "@/components/dashboard/leagues/new-player-file-constraints";
import { parseNewLeagueRefereeForm } from "@/components/dashboard/leagues/new-league-referee-form-schema";
import { AppAuditEntityType, recordAppAuditLog } from "@/logic/audit";
import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import {
  createLeagueReferee,
  deleteLeagueRefereeById,
  mergeLeagueRefereeMetadata,
} from "@/logic/leagues/create-league-referee";
import { leagueShieldStorageBucket } from "@/logic/leagues/upload-league-shield";
import {
  uploadLeagueRefereeCurp,
  uploadLeagueRefereePhoto,
} from "@/logic/leagues/upload-league-referee-photo";
import { tryRemovePlayerFiles } from "@/logic/players/upload-player-files";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function readFormString(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
}

/**
 * POST — alta de árbitro de contacto (`league_referees`).
 * Multipart: campos de texto + archivos opcionales `photo` y `curp` (CURP como archivo, igual que jugadores).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ leagueId: string }> },
) {
  try {
    const { leagueId } = await context.params;
    if (!leagueId) {
      return NextResponse.json({ error: "Liga no válida" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const appUser = await syncAppUserFromSupabaseAuthUser(user);
    const form = await request.formData();

    const parsed = parseNewLeagueRefereeForm({
      leagueId,
      fullName: readFormString(form, "fullName"),
      whatsappCountryIso: readFormString(form, "whatsappCountryIso") || "MX",
      whatsappPhoneNational: readFormString(form, "whatsappPhoneNational"),
      email: readFormString(form, "email"),
      notes: readFormString(form, "notes"),
    });
    if (!parsed.ok) {
      return NextResponse.json({ error: "Validación", fields: parsed.fields }, { status: 400 });
    }

    const d = parsed.data;
    const created = await createLeagueReferee({
      actorUserId: appUser.id,
      leagueId: d.leagueId,
      fullName: d.fullName,
      whatsappE164: d.whatsappE164,
      email: d.email,
      notes: d.notes,
    });

    if (!created.ok) {
      if (created.reason === "forbidden") {
        return NextResponse.json({ error: "No tenés permiso para esta liga." }, { status: 403 });
      }
      if (created.reason === "schema_not_ready") {
        return NextResponse.json(
          {
            error:
              "La base de datos a la que conecta Next no tiene la tabla `league_referees`. Suele pasar si `npm run db:migrate` usó otra DATABASE_URL (p. ej. solo `.env` pero Next lee `.env.development.local`). Unificá la URL, ejecutá `npm run db:migrate` o `npm run db:ensure:league-referees`, y reiniciá el servidor.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Liga no encontrada." }, { status: 404 });
    }

    const photoEntry = form.get("photo");
    const curpEntry = form.get("curp");

    const filesToUpload: Array<{
      file: File;
      metadataKey: "photo" | "curp";
      doUpload: (
        client: SupabaseClient,
        args: {
          bucket: string;
          leagueOwnerUserId: string;
          refereeId: string;
          bytes: Uint8Array;
          contentType: string;
        },
      ) => ReturnType<typeof uploadLeagueRefereePhoto>;
    }> = [];

    if (photoEntry instanceof File && photoEntry.size > 0) {
      if (photoEntry.size > PLAYER_PHOTO_MAX_FILE_BYTES) {
        await deleteLeagueRefereeById(created.refereeId);
        return NextResponse.json(
          { error: "La foto supera el tamaño máximo permitido." },
          { status: 400 },
        );
      }
      if (!PLAYER_PHOTO_MIME_TYPES.has(photoEntry.type)) {
        await deleteLeagueRefereeById(created.refereeId);
        return NextResponse.json({ error: "La foto debe ser JPG, PNG o WebP." }, { status: 400 });
      }
      filesToUpload.push({ file: photoEntry, metadataKey: "photo", doUpload: uploadLeagueRefereePhoto });
    }

    if (curpEntry instanceof File && curpEntry.size > 0) {
      if (curpEntry.size > PLAYER_CURP_MAX_FILE_BYTES) {
        await deleteLeagueRefereeById(created.refereeId);
        return NextResponse.json(
          { error: "El archivo de CURP supera el tamaño máximo permitido." },
          { status: 400 },
        );
      }
      if (!PLAYER_CURP_MIME_TYPES.has(curpEntry.type)) {
        await deleteLeagueRefereeById(created.refereeId);
        return NextResponse.json(
          { error: "La CURP debe ser PDF, JPG, PNG o WebP." },
          { status: 400 },
        );
      }
      filesToUpload.push({ file: curpEntry, metadataKey: "curp", doUpload: uploadLeagueRefereeCurp });
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
          const ref = await item.doUpload(storageClient, {
            bucket,
            leagueOwnerUserId: created.leagueOwnerUserId,
            refereeId: created.refereeId,
            bytes,
            contentType: item.file.type,
          });
          uploadedPaths.push(ref.path);
          metadataPatch[item.metadataKey] = {
            bucket: ref.bucket,
            path: ref.path,
            publicUrl: ref.publicUrl,
          };
        }
        await mergeLeagueRefereeMetadata(created.refereeId, metadataPatch);
      } catch (err) {
        console.error("[POST .../referees] file upload", err);
        await tryRemovePlayerFiles(storageClient, bucket, uploadedPaths);
        await deleteLeagueRefereeById(created.refereeId);
        return NextResponse.json(
          {
            error:
              "No se pudo guardar un archivo en Storage. El árbitro no se guardó. Revisá el bucket o la clave de servicio.",
          },
          { status: 503 },
        );
      }
    }

    await recordAppAuditLog({
      actorUserId: appUser.id,
      action: "create",
      entityType: AppAuditEntityType.leagueReferee,
      entityId: created.refereeId,
      leagueId,
      summary: "Árbitro de contacto agregado",
      metadata: { fullName: d.fullName },
    });

    return NextResponse.json({ refereeId: created.refereeId }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/leagues/[leagueId]/referees]", e);
    return NextResponse.json({ error: "No se pudo guardar el árbitro." }, { status: 500 });
  }
}
