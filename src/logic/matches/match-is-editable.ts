/** Estados en los que el fixture ya no admite edición de datos del partido. */
const NON_EDITABLE_MATCH_STATUSES = new Set(["finished", "walkover"]);

export function isMatchEditable(status: string): boolean {
  return !NON_EDITABLE_MATCH_STATUSES.has(status);
}

/** Partidos cerrados: solo lectura con resumen a pantalla completa. */
export function isMatchRecapView(status: string): boolean {
  return NON_EDITABLE_MATCH_STATUSES.has(status);
}
