/** Límite razonable para escudo en formulario (no subir RAW de cámara enormes). */
export const LEAGUE_SHIELD_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MiB

export const LEAGUE_SHIELD_ACCEPT_ATTR = "image/jpeg,image/png,image/webp";

export const LEAGUE_SHIELD_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
