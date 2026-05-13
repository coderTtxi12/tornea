/** Foto del jugador: misma política que escudos (JPG/PNG/WebP, ≤ 2 MiB). */
export const PLAYER_PHOTO_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MiB
export const PLAYER_PHOTO_ACCEPT_ATTR = "image/jpeg,image/png,image/webp";
export const PLAYER_PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** CURP: imagen o PDF, hasta 5 MiB. */
export const PLAYER_CURP_MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MiB
export const PLAYER_CURP_ACCEPT_ATTR = "image/jpeg,image/png,image/webp,application/pdf";
export const PLAYER_CURP_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function playerFileExtensionForContentType(
  contentType: string,
): "jpg" | "png" | "webp" | "pdf" | null {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "application/pdf") return "pdf";
  return null;
}
