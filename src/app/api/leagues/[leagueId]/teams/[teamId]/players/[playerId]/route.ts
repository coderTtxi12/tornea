import { NextResponse } from "next/server";
import {
  readFormString,
  requireAppUser,
  validationErrorFromZod,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

import {
  PLAYER_CURP_MAX_FILE_BYTES,
  PLAYER_CURP_MIME_TYPES,
  PLAYER_PHOTO_MAX_FILE_BYTES,
  PLAYER_PHOTO_MIME_TYPES,
} from "@/components/dashboard/leagues/new-player-file-constraints";
import {
  buildOptionalPlayerWhatsappE164,
  newPlayerFormFieldsSchema,
  parseOptionalDocIdCurp,
  parseOptionalShirtNumber,
} from "@/schemas/dashboard/new-player-form-schema";
import { getDb } from "@/db/client";
import { AppAuditEntityType, recordAppAuditLog } from "@/logic/audit";
import { getLeagueOwnerUserId } from "@/logic/leagues/league-dashboard-admin";
import { mergePlayerMetadata } from "@/logic/players/create-player-in-team";
import { getPlayerForOwnerEdit } from "@/logic/players/get-player-for-owner-edit";
import { tryRemovePlayerFiles, uploadPlayerFile } from "@/logic/players/upload-player-files";
import { updatePlayerForOwner } from "@/logic/players/update-player-for-owner";
import { leagueShieldStorageBucket } from "@/logic/leagues/upload-league-shield";
import { resolvePlayerPhotoForImgDisplay } from "@/logic/leagues/resolve-supabase-storage-url-for-img-display";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { splitE164ToCountryAndNational } from "@/lib/phone/e164-split";


/**
 * GET — jugador + plantilla en temporada objetivo (solo dueño de la liga).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ leagueId: string; teamId: string; playerId: string }> },
) {
  try {
    const { leagueId, teamId, playerId } = await context.params;
    if (!leagueId || !teamId || !playerId) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;
    const result = await getPlayerForOwnerEdit(appUser.id, leagueId, teamId, playerId);

    if (result === "FORBIDDEN") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }
    if (result === "NOT_FOUND") {
      return NextResponse.json({ error: "Jugador no encontrado." }, { status: 404 });
    }

    const meta =
      result.player.metadata &&
      typeof result.player.metadata === "object" &&
      !Array.isArray(result.player.metadata)
        ? (result.player.metadata as Record<string, unknown>)
        : {};

    const e164 =
      typeof meta.whatsappE164 === "string" && meta.whatsappE164.trim()
        ? meta.whatsappE164.trim()
        : "";
    const { iso2, nationalDigits } = splitE164ToCountryAndNational(e164);

    const photoUrl = await resolvePlayerPhotoForImgDisplay(result.player.metadata);

    return NextResponse.json({
      player: {
        id: result.player.id,
        leagueId: result.player.leagueId,
        fullName: result.player.fullName,
        docId: result.player.docId,
        birthDate: result.player.birthDate,
        whatsappCountryIso: iso2,
        whatsappPhoneNational: nationalDigits,
      },
      roster: {
        id: result.roster.id,
        teamId: result.roster.teamId,
        shirtNumber: result.roster.shirtNumber,
        position: result.roster.position,
      },
      existingPhotoUrl: photoUrl,
    });
  } catch (e) {
    console.error("[GET .../players/[playerId]]", e);
    return NextResponse.json({ error: "No se pudo cargar el jugador." }, { status: 500 });
  }
}

/**
 * PATCH — actualizar jugador y fila de plantilla (multipart opcional `photo`, `curp`).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ leagueId: string; teamId: string; playerId: string }> },
) {
  try {
    const { leagueId, teamId, playerId } = await context.params;
    if (!leagueId || !teamId || !playerId) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;
    const form = await request.formData();

    const parsed = newPlayerFormFieldsSchema.safeParse({
      teamId,
      leagueId,
      fullName: readFormString(form, "fullName"),
      birthDate: readFormString(form, "birthDate"),
      shirtNumber: readFormString(form, "shirtNumber"),
      position: readFormString(form, "position"),
      whatsappCountryIso: readFormString(form, "whatsappCountryIso") || "MX",
      whatsappPhoneNational: readFormString(form, "whatsappPhoneNational"),
      docId: readFormString(form, "docId"),
    });
    if (!parsed.success) {
      return validationErrorFromZod(parsed.error);
    }

    const data = parsed.data;
    const whatsappE164 = buildOptionalPlayerWhatsappE164(
      data.whatsappCountryIso,
      data.whatsappPhoneNational,
    );

    const updated = await updatePlayerForOwner({
      ownerUserId: appUser.id,
      leagueId,
      teamId,
      playerId,
      fullName: data.fullName,
      birthDate: data.birthDate.trim(),
      shirtNumber: parseOptionalShirtNumber(data.shirtNumber),
      position: data.position ?? null,
      whatsappE164,
      docId: parseOptionalDocIdCurp(data.docId),
    });

    if (updated === "FORBIDDEN") {
      return NextResponse.json({ error: "No tenés permiso para esta liga." }, { status: 403 });
    }
    if (updated === "NOT_FOUND") {
      return NextResponse.json({ error: "Jugador no encontrado." }, { status: 404 });
    }

    const fullNameTrim = data.fullName.trim();
    await recordAppAuditLog(
      {
        actorUserId: appUser.id,
        action: "update",
        entityType: AppAuditEntityType.player,
        entityId: playerId,
        leagueId,
        summary: `Jugador actualizado: ${fullNameTrim}`,
        metadata: {
          teamId,
          shirtNumber: parseOptionalShirtNumber(data.shirtNumber),
          position: data.position?.trim() || null,
        },
      },
      { swallowErrors: true },
    );

    const photoEntry = form.get("photo");
    const curpEntry = form.get("curp");

    const filesToUpload: Array<{
      kind: "photo" | "curp";
      file: File;
      metadataKey: "photo" | "curp";
    }> = [];
    if (photoEntry instanceof File && photoEntry.size > 0) {
      if (photoEntry.size > PLAYER_PHOTO_MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "La foto del jugador supera el tamaño máximo permitido." },
          { status: 400 },
        );
      }
      if (!PLAYER_PHOTO_MIME_TYPES.has(photoEntry.type)) {
        return NextResponse.json(
          { error: "La foto debe ser JPG, PNG o WebP." },
          { status: 400 },
        );
      }
      filesToUpload.push({ kind: "photo", file: photoEntry, metadataKey: "photo" });
    }
    if (curpEntry instanceof File && curpEntry.size > 0) {
      if (curpEntry.size > PLAYER_CURP_MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "El archivo de CURP supera el tamaño máximo permitido." },
          { status: 400 },
        );
      }
      if (!PLAYER_CURP_MIME_TYPES.has(curpEntry.type)) {
        return NextResponse.json(
          { error: "La CURP debe ser PDF, JPG, PNG o WebP." },
          { status: 400 },
        );
      }
      filesToUpload.push({ kind: "curp", file: curpEntry, metadataKey: "curp" });
    }

    if (filesToUpload.length > 0) {
      const bucket = leagueShieldStorageBucket();
      const service = createServiceRoleClient();
      const storageClient = service ?? (await createClient());
      const storageOwner = await getLeagueOwnerUserId(getDb(), leagueId);
      if (!storageOwner) {
        return NextResponse.json({ error: "Liga no encontrada." }, { status: 404 });
      }
      const uploadedPaths: string[] = [];
      const metadataPatch: Record<string, unknown> = {};

      try {
        for (const item of filesToUpload) {
          const bytes = new Uint8Array(await item.file.arrayBuffer());
          const ref = await uploadPlayerFile(storageClient, {
            bucket,
            ownerUserId: storageOwner,
            playerId,
            kind: item.kind,
            bytes,
            contentType: item.file.type,
          });
          uploadedPaths.push(ref.path);
          metadataPatch[item.metadataKey] = ref;
        }
        await mergePlayerMetadata(playerId, metadataPatch);
        await recordAppAuditLog(
          {
            actorUserId: appUser.id,
            action: "update",
            entityType: AppAuditEntityType.player,
            entityId: playerId,
            leagueId,
            summary: `Archivos del jugador actualizados: ${fullNameTrim}`,
            metadata: {
              teamId,
              subAction: "player_files",
              files: filesToUpload.map((f) => f.kind),
            },
          },
          { swallowErrors: true },
        );
      } catch (err) {
        console.error("[PATCH .../players/[playerId]] file upload", err);
        await tryRemovePlayerFiles(storageClient, bucket, uploadedPaths);
        return NextResponse.json(
          {
            error:
              "No se pudo guardar el archivo en Storage. Los datos del jugador sí se actualizaron.",
          },
          { status: 503 },
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH .../players/[playerId]]", e);
    return NextResponse.json({ error: "No se pudo actualizar al jugador." }, { status: 500 });
  }
}
