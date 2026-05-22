/** Máximo minuto de juego registrable en incidencias (incl. descuento). */
export const MAX_MATCH_MINUTE = 130;

/**
 * Minuto de juego según el reloj visible (p. ej. 10:08 → 10).
 * Debe coincidir con la parte de minutos de `formatClock` en la UI en vivo.
 */
export function matchMinuteFromElapsedSeconds(elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  return Math.min(MAX_MATCH_MINUTE, Math.floor(elapsedSeconds / 60));
}
