import type { SupabaseClient } from "@supabase/supabase-js";

import { playerFileExtensionForContentType } from "@/components/dashboard/leagues/new-player-file-constraints";

export type PlayerFileRef = {
  bucket: string;
  path: string;
  publicUrl: string;
  contentType: string;
};

export type PlayerStorageFileKind = "photo" | "curp";

type UploadArgs = {
  bucket: string;
  ownerUserId: string;
  playerId: string;
  /** Nombre base del objeto en Storage (`photo.jpg`, `curp.pdf`, …). */
  kind: PlayerStorageFileKind;
  bytes: Uint8Array;
  contentType: string;
};

/**
 * Sube un archivo del jugador (foto o CURP) al bucket de Storage.
 * Path: `{ownerUserId}/players/{playerId}/{kind}.{ext}` (`photo`, `curp`).
 *
 * Si el bucket es público, `publicUrl` queda accesible directo. Si es privado, hay
 * que firmar la URL más adelante (igual que el escudo de la liga).
 */
export async function uploadPlayerFile(
  supabase: SupabaseClient,
  args: UploadArgs,
): Promise<PlayerFileRef> {
  const ext = playerFileExtensionForContentType(args.contentType);
  if (!ext) {
    throw new Error(`Tipo de archivo no permitido para ${args.kind}.`);
  }

  const path = `${args.ownerUserId}/players/${args.playerId}/${args.kind}.${ext}`;
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

/** Limpieza best-effort de archivos subidos cuando hay rollback. */
export async function tryRemovePlayerFiles(
  supabase: SupabaseClient,
  bucket: string,
  paths: readonly string[],
): Promise<void> {
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(bucket).remove([...paths]);
  } catch {
    /* RLS u otros errores: el rollback de DB es lo prioritario. */
  }
}
