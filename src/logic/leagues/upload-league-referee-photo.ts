import type { SupabaseClient } from "@supabase/supabase-js";

import { playerFileExtensionForContentType } from "@/components/dashboard/leagues/new-player-file-constraints";

import type { PlayerFileRef } from "@/logic/players/upload-player-files";

type UploadArgs = {
  bucket: string;
  /** Dueño de la liga — mismo prefijo de paths que jugadores (`leagueOwnerUserId/...`). */
  leagueOwnerUserId: string;
  refereeId: string;
  bytes: Uint8Array;
  contentType: string;
};

/**
 * Foto de perfil del árbitro: bucket compartido con escudos/jugadores.
 * Path: `{leagueOwnerUserId}/league-referees/{refereeId}/photo.{ext}`.
 */
export async function uploadLeagueRefereePhoto(
  supabase: SupabaseClient,
  args: UploadArgs,
): Promise<PlayerFileRef> {
  const ext = playerFileExtensionForContentType(args.contentType);
  if (!ext || ext === "pdf") {
    throw new Error("La foto debe ser JPG, PNG o WebP.");
  }

  const path = `${args.leagueOwnerUserId}/league-referees/${args.refereeId}/photo.${ext}`;
  const bucketRef = supabase.storage.from(args.bucket);
  const { error } = await bucketRef.upload(path, args.bytes, {
    cacheControl: "3600",
    contentType: args.contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = bucketRef.getPublicUrl(path);
  return {
    bucket: args.bucket,
    path,
    publicUrl: data.publicUrl,
    contentType: args.contentType,
  };
}

/**
 * CURP u otro documento del árbitro (imagen o PDF).
 * Path: `{leagueOwnerUserId}/league-referees/{refereeId}/curp.{ext}`.
 */
export async function uploadLeagueRefereeCurp(
  supabase: SupabaseClient,
  args: UploadArgs,
): Promise<PlayerFileRef> {
  const ext = playerFileExtensionForContentType(args.contentType);
  if (!ext) {
    throw new Error("Tipo de archivo no permitido para CURP.");
  }

  const path = `${args.leagueOwnerUserId}/league-referees/${args.refereeId}/curp.${ext}`;
  const bucketRef = supabase.storage.from(args.bucket);
  const { error } = await bucketRef.upload(path, args.bytes, {
    cacheControl: "3600",
    contentType: args.contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = bucketRef.getPublicUrl(path);
  return {
    bucket: args.bucket,
    path,
    publicUrl: data.publicUrl,
    contentType: args.contentType,
  };
}
