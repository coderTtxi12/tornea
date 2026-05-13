import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  LEAGUE_SHIELD_MAX_FILE_BYTES,
  LEAGUE_SHIELD_MIME_TYPES,
} from "@/components/dashboard/leagues/league-shield-constraints";
import {
  newVenueFormFieldsSchema,
  venueSurfaceDisplayLabel,
} from "@/components/dashboard/leagues/new-venue-form-schema";
import { getDb } from "@/db/client";
import { venues } from "@/db/schema";
import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import { getLeagueOwnerUserId } from "@/logic/leagues/league-dashboard-admin";
import { getVenueForOwnerEdit } from "@/logic/leagues/get-venue-for-owner-edit";
import { leagueShieldStorageBucket } from "@/logic/leagues/upload-league-shield";
import {
  tryRemoveVenuePhotoPaths,
  uploadVenueGalleryImages,
} from "@/logic/leagues/upload-venue-photos";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_VENUE_PHOTOS = 8;

function readFormString(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
}

/**
 * GET — datos de cancha para edición (solo dueño de la liga).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ leagueId: string; venueId: string }> },
) {
  try {
    const { leagueId, venueId } = await context.params;
    if (!leagueId || !venueId) {
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
    const result = await getVenueForOwnerEdit(appUser.id, leagueId, venueId);

    if (result === "FORBIDDEN") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }
    if (result === "NOT_FOUND") {
      return NextResponse.json({ error: "Cancha no encontrada." }, { status: 404 });
    }

    const { venue } = result;
    return NextResponse.json({
      venue: {
        id: venue.id,
        leagueId: venue.leagueId,
        name: venue.name,
        address: venue.address ?? "",
        surfacePreset: venue.surfacePreset,
        surfaceCustom: venue.surfaceCustom,
        availabilityNotes: venue.availabilityNotes,
        existingPhotoCount: venue.existingPhotoRefs.length,
      },
    });
  } catch (e) {
    console.error("[GET /api/leagues/[leagueId]/venues/[venueId]]", e);
    return NextResponse.json({ error: "No se pudo cargar la cancha." }, { status: 500 });
  }
}

/**
 * PATCH — actualizar cancha (multipart opcional `photos`, flag `clearExistingPhotos`).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ leagueId: string; venueId: string }> },
) {
  try {
    const { leagueId, venueId } = await context.params;
    if (!leagueId || !venueId) {
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
    const loaded = await getVenueForOwnerEdit(appUser.id, leagueId, venueId);

    if (loaded === "FORBIDDEN") {
      return NextResponse.json({ error: "No tenés permiso para esta liga." }, { status: 403 });
    }
    if (loaded === "NOT_FOUND") {
      return NextResponse.json({ error: "Cancha no encontrada." }, { status: 404 });
    }

    const form = await request.formData();
    const clearExistingPhotos = readFormString(form, "clearExistingPhotos") === "true";

    const parsedFields = newVenueFormFieldsSchema.safeParse({
      name: readFormString(form, "name"),
      address: readFormString(form, "address"),
      surfacePreset: readFormString(form, "surfacePreset"),
      surfaceCustom: readFormString(form, "surfaceCustom"),
      availabilityNotes: readFormString(form, "availabilityNotes"),
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
    const surfaceType = venueSurfaceDisplayLabel(d.surfacePreset, d.surfaceCustom);

    const photoEntries = form
      .getAll("photos")
      .filter((x): x is File => x instanceof File && x.size > 0);

    const existingRefs = loaded.venue.existingPhotoRefs;
    const kept = clearExistingPhotos ? [] : existingRefs;

    if (kept.length + photoEntries.length > MAX_VENUE_PHOTOS) {
      return NextResponse.json(
        {
          error: `Máximo ${MAX_VENUE_PHOTOS} fotos en total.`,
          fields: {
            photos: `Quedan ${kept.length} foto(s). Podés subir hasta ${MAX_VENUE_PHOTOS - kept.length} más, o marcá quitar todas.`,
          },
        },
        { status: 400 },
      );
    }

    for (const f of photoEntries) {
      if (f.size > LEAGUE_SHIELD_MAX_FILE_BYTES) {
        return NextResponse.json(
          {
            error: "Una foto supera el tamaño máximo permitido.",
            fields: { photos: "Cada imagen debe ser de hasta 2 MiB." },
          },
          { status: 400 },
        );
      }
      if (!LEAGUE_SHIELD_MIME_TYPES.has(f.type)) {
        return NextResponse.json(
          {
            error: "Formato de imagen no permitido.",
            fields: { photos: "Usá JPG, PNG o WebP." },
          },
          { status: 400 },
        );
      }
    }

    const baseMeta: Record<string, unknown> = {
      surfaceType,
      surfacePreset: d.surfacePreset,
    };
    if (d.surfacePreset === "other") {
      baseMeta.surfaceCustom = d.surfaceCustom.trim();
    }
    if (d.availabilityNotes.trim()) {
      baseMeta.availabilityNotes = d.availabilityNotes.trim();
    }

    let filePayload: { bytes: Uint8Array; contentType: string }[] = [];
    if (photoEntries.length > 0) {
      try {
        filePayload = await Promise.all(
          photoEntries.map(async (f) => ({
            bytes: new Uint8Array(await f.arrayBuffer()),
            contentType: f.type,
          })),
        );
      } catch {
        return NextResponse.json({ error: "No se pudieron leer las fotos." }, { status: 400 });
      }
    }

    const bucket = leagueShieldStorageBucket();
    const service = createServiceRoleClient();
    const storageClient = service ?? supabase;

    const storageOwner = await getLeagueOwnerUserId(getDb(), leagueId);
    if (!storageOwner) {
      return NextResponse.json({ error: "Liga no encontrada." }, { status: 404 });
    }

    let newRefs: Awaited<ReturnType<typeof uploadVenueGalleryImages>> = [];
    if (filePayload.length > 0) {
      try {
        newRefs = await uploadVenueGalleryImages(storageClient, {
          bucket,
          ownerUserId: storageOwner,
          leagueId,
          venueId,
          startIndex: kept.length,
          files: filePayload,
        });
      } catch (err) {
        console.error("[PATCH .../venues/[venueId]] photo upload", err);
        return NextResponse.json(
          {
            error:
              "No se pudo guardar las fotos en Storage. Los demás datos no se actualizaron.",
          },
          { status: 503 },
        );
      }
    }

    const finalPhotos = [...kept, ...newRefs];
    if (finalPhotos.length > 0) {
      baseMeta.photos = finalPhotos;
    }

    const newPathSet = new Set(newRefs.map((r) => r.path));
    const pathsToDelete =
      clearExistingPhotos && existingRefs.length > 0
        ? existingRefs.map((r) => r.path).filter((p) => !newPathSet.has(p))
        : [];

    const db = getDb();
    await db
      .update(venues)
      .set({
        name: d.name.trim(),
        address: d.address.trim(),
        metadata: baseMeta,
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venueId));

    if (pathsToDelete.length > 0) {
      await tryRemoveVenuePhotoPaths(storageClient, bucket, pathsToDelete);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/leagues/[leagueId]/venues/[venueId]]", e);
    return NextResponse.json({ error: "No se pudo actualizar la cancha." }, { status: 500 });
  }
}
