import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  readFormString,
  requireAppUser,
  validationErrorFromZod,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

import {
  LEAGUE_SHIELD_MAX_FILE_BYTES,
  LEAGUE_SHIELD_MIME_TYPES,
} from "@/components/dashboard/leagues/league-shield-constraints";
import {
  newVenueFormFieldsSchema,
  venueSurfaceDisplayLabel,
} from "@/schemas/dashboard/new-venue-form-schema";
import { getDb } from "@/db/client";
import { venues } from "@/db/schema";
import { createVenueInLeague } from "@/logic/leagues/create-venue-in-league";
import {
  leagueShieldStorageBucket,
} from "@/logic/leagues/upload-league-shield";
import { uploadVenueGalleryImages } from "@/logic/leagues/upload-venue-photos";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_VENUE_PHOTOS = 8;


/**
 * POST — crear cancha (`venues`) en una liga del dueño.
 * Multipart: campos de texto + archivos opcionales repetidos `photos`.
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

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;
    const form = await request.formData();

    const parsedFields = newVenueFormFieldsSchema.safeParse({
      name: readFormString(form, "name"),
      address: readFormString(form, "address"),
      surfacePreset: readFormString(form, "surfacePreset"),
      surfaceCustom: readFormString(form, "surfaceCustom"),
      availabilityNotes: readFormString(form, "availabilityNotes"),
    });

    if (!parsedFields.success) {
      return validationErrorFromZod(parsedFields.error);
    }

    const d = parsedFields.data;
    const surfaceType = venueSurfaceDisplayLabel(d.surfacePreset, d.surfaceCustom);

    const photoEntries = form
      .getAll("photos")
      .filter((x): x is File => x instanceof File && x.size > 0);

    if (photoEntries.length > MAX_VENUE_PHOTOS) {
      return NextResponse.json(
        {
          error: `Máximo ${MAX_VENUE_PHOTOS} fotos.`,
          fields: { photos: `Subí como mucho ${MAX_VENUE_PHOTOS} imágenes.` },
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

    const metadata: Record<string, unknown> = {
      surfaceType,
      surfacePreset: d.surfacePreset,
    };
    if (d.surfacePreset === "other") {
      metadata.surfaceCustom = d.surfaceCustom.trim();
    }
    if (d.availabilityNotes.trim()) {
      metadata.availabilityNotes = d.availabilityNotes.trim();
    }

    let created: { venueId: string; leagueOwnerUserId: string };
    try {
      created = await createVenueInLeague({
        ownerUserId: appUser.id,
        leagueId,
        name: d.name,
        address: d.address,
        metadata,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Liga no encontrada." }, { status: 404 });
      }
      if (e instanceof Error && e.message === "FORBIDDEN") {
        return NextResponse.json({ error: "No tenés permiso para esta liga." }, { status: 403 });
      }
      throw e;
    }

    if (photoEntries.length === 0) {
      return NextResponse.json({ venue: { id: created.venueId } }, { status: 201 });
    }

    const bucket = leagueShieldStorageBucket();
    const service = createServiceRoleClient();
    const storageClient = service ?? (await createClient());

    let filePayload: { bytes: Uint8Array; contentType: string }[];
    try {
      filePayload = await Promise.all(
        photoEntries.map(async (f) => ({
          bytes: new Uint8Array(await f.arrayBuffer()),
          contentType: f.type,
        })),
      );
    } catch {
      const db = getDb();
      await db.delete(venues).where(eq(venues.id, created.venueId));
      return NextResponse.json({ error: "No se pudieron leer las fotos." }, { status: 400 });
    }

    try {
      const refs = await uploadVenueGalleryImages(storageClient, {
        bucket,
        ownerUserId: created.leagueOwnerUserId,
        leagueId,
        venueId: created.venueId,
        files: filePayload,
      });

      const db = getDb();
      await db
        .update(venues)
        .set({
          metadata: { ...metadata, photos: refs },
          updatedAt: new Date(),
        })
        .where(eq(venues.id, created.venueId));
    } catch (err) {
      console.error("[POST /api/leagues/[leagueId]/venues] photo upload", err);
      const db = getDb();
      await db.delete(venues).where(eq(venues.id, created.venueId));
      return NextResponse.json(
        {
          error:
            "No se pudo guardar las fotos en Storage. La cancha no se guardó. Revisá el bucket o la clave de servicio.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ venue: { id: created.venueId } }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/leagues/[leagueId]/venues]", e);
    return NextResponse.json({ error: "No se pudo crear la cancha." }, { status: 500 });
  }
}
