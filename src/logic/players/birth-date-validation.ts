/** Fecha local `YYYY-MM-DD` (límite superior de nacimiento = hoy). */
export function localIsoDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const BIRTH_DATE_MIN_ISO = "1900-01-01";

export function birthDateMaxIso(): string {
  return localIsoDateString();
}

/** Mensaje de error en español, o `null` si la fecha es válida. */
export function validateBirthDateIso(val: string): string | null {
  const s = val.trim();
  if (!s) return "Captura la fecha de nacimiento.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return "Selecciona una fecha de nacimiento válida.";
  }
  const [yStr, mStr, dStr] = s.split("-");
  const y = Number(yStr);
  const mo = Number(mStr);
  const d = Number(dStr);
  if (!y || !mo || !d || mo < 1 || mo > 12 || d < 1 || d > 31) {
    return "La fecha de nacimiento no es válida.";
  }
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return "La fecha de nacimiento no es válida.";
  }
  if (y < 1900) return "Revisa el año de nacimiento.";
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  if (dt.getTime() >= todayUtc) {
    return "La fecha de nacimiento debe ser anterior a hoy.";
  }
  return null;
}
