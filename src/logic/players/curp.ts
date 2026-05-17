/**
 * Validación local de CURP: longitud fija y caracteres alfanuméricos (sin consultar RENAPO).
 */

export const CURP_LENGTH = 18;

/** Ejemplo mostrado en formularios. */
export const CURP_FORMAT_EXAMPLE = "SATO930714HTLNXL08";

/** Tras normalizar: exactamente 18 caracteres A–Z, 0–9 o Ñ. */
const CURP_ALPHANUMERIC_RE = /^[A-Z0-9Ñ]{18}$/;

/** Normaliza entrada (mayúsculas, sin espacios ni guiones). */
export function normalizeCurpInput(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

/** `true` si la cadena ya normalizada tiene 18 caracteres alfanuméricos. */
export function isValidMexicanCurp(normalized: string): boolean {
  return normalized.length === CURP_LENGTH && CURP_ALPHANUMERIC_RE.test(normalized);
}

/**
 * Vacío → `null`. Con texto → CURP normalizada o `null` si no cumple longitud/alfanumérico.
 */
export function parseOptionalCurpForStorage(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.length) return null;
  const normalized = normalizeCurpInput(trimmed);
  if (!isValidMexicanCurp(normalized)) return null;
  return normalized;
}

/** Mensaje de error para formularios cuando hay texto pero no pasa validación. */
export function invalidCurpMessage(): string {
  return `La CURP debe tener ${CURP_LENGTH} caracteres alfanuméricos.`;
}
