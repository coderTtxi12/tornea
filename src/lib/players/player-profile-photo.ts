import type { PlayerFileRef } from "@/logic/players/upload-player-files";

/** Claves conocidas en `players.metadata` para archivos de Storage. */
export type PlayerFileMetadata = {
  photo?: PlayerFileRef | string;
  curp?: PlayerFileRef;
};

/**
 * URL guardada para la foto del jugador (`metadata.photo`).
 * Acepta el objeto `PlayerFileRef`, texto URL plano, o `public_url` por compatibilidad.
 */
export function playerProfileImageUrl(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const rawPhoto = (metadata as Record<string, unknown>).photo;
  if (typeof rawPhoto === "string") {
    const t = rawPhoto.trim();
    return t || null;
  }
  if (!rawPhoto || typeof rawPhoto !== "object" || Array.isArray(rawPhoto)) {
    return null;
  }
  const o = rawPhoto as Record<string, unknown>;
  const fromCamel =
    typeof o.publicUrl === "string" ? o.publicUrl.trim() : "";
  const fromSnake =
    typeof o.public_url === "string" ? o.public_url.trim() : "";
  return fromCamel || fromSnake || null;
}
