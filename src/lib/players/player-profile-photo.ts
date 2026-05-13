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

/**
 * Archivo CURP guardado en `players.metadata.curp` (`PlayerFileRef`: bucket + path).
 */
export function playerCurpUploadSummary(metadata: unknown): {
  uploaded: boolean;
  fileName: string | null;
} {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { uploaded: false, fileName: null };
  }
  const raw = (metadata as Record<string, unknown>).curp;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { uploaded: false, fileName: null };
  }
  const o = raw as Record<string, unknown>;
  const bucket = typeof o.bucket === "string" ? o.bucket.trim() : "";
  const path = typeof o.path === "string" ? o.path.trim() : "";
  if (!bucket || !path) {
    return { uploaded: false, fileName: null };
  }
  const base = path.split("/").pop()?.trim() || null;
  return { uploaded: true, fileName: base };
}

/** Nombre sugerido para descarga de la foto (`metadata.photo` con `path`). */
export function playerPhotoStorageFileName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const rawPhoto = (metadata as Record<string, unknown>).photo;
  if (typeof rawPhoto === "string" || !rawPhoto || typeof rawPhoto !== "object") {
    return null;
  }
  const path = typeof (rawPhoto as Record<string, unknown>).path === "string"
    ? (rawPhoto as Record<string, unknown>).path as string
    : "";
  const t = path.trim();
  if (!t) return null;
  return t.split("/").pop()?.trim() || null;
}
