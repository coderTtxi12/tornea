import type { SupabaseClient } from "@supabase/supabase-js";

import { shieldExtensionForContentType } from "@/logic/leagues/upload-league-shield";

export type VenuePhotoRef = {
  bucket: string;
  path: string;
  publicUrl: string;
  contentType: string;
};

/**
 * Sube imágenes de la cancha a Storage. Path:
 * `{ownerUserId}/{leagueId}/venues/{venueId}/photo-{n}.{ext}`
 */
export async function uploadVenueGalleryImages(
  supabase: SupabaseClient,
  args: {
    bucket: string;
    ownerUserId: string;
    leagueId: string;
    venueId: string;
    /** Índice inicial para `photo-{n}` al agregar imágenes sin borrar las existentes. */
    startIndex?: number;
    files: readonly { bytes: Uint8Array; contentType: string }[];
  },
): Promise<VenuePhotoRef[]> {
  const refs: VenuePhotoRef[] = [];
  const bucketRef = supabase.storage.from(args.bucket);
  const start = args.startIndex ?? 0;

  for (let i = 0; i < args.files.length; i++) {
    const file = args.files[i]!;
    const ext = shieldExtensionForContentType(file.contentType);
    if (!ext) {
      throw new Error(`Tipo de imagen no permitido: ${file.contentType}`);
    }
    const n = start + i;
    const path = `${args.ownerUserId}/${args.leagueId}/venues/${args.venueId}/photo-${n}.${ext}`;
    const { error } = await bucketRef.upload(path, file.bytes, {
      cacheControl: "3600",
      contentType: file.contentType,
      upsert: true,
    });
    if (error) throw error;

    const { data } = bucketRef.getPublicUrl(path);
    refs.push({
      bucket: args.bucket,
      path,
      publicUrl: data.publicUrl,
      contentType: file.contentType,
    });
  }

  return refs;
}

export async function tryRemoveVenuePhotoPaths(
  supabase: SupabaseClient,
  bucket: string,
  paths: readonly string[],
): Promise<void> {
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(bucket).remove([...paths]);
  } catch {
    /* best-effort */
  }
}
