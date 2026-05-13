/**
 * Expande abreviaturas habituales de posición (fútbol) a nombre legible en español.
 * Si no hay coincidencia, devuelve el texto original recortado (capitalizado suave).
 */
const ABBR: Record<string, string> = {
  // Portero
  por: "Portero",
  portero: "Portero",
  gk: "Portero",
  gol: "Portero",
  port: "Portero",
  // Defensa
  def: "Defensa",
  defensa: "Defensa",
  df: "Defensa",
  cb: "Defensa central",
  dc: "Defensa central",
  dfc: "Defensa central",
  "def central": "Defensa central",
  li: "Lateral izquierdo",
  ld: "Lateral derecho",
  lat: "Lateral",
  lateral: "Lateral",
  car: "Carrilero",
  carrilero: "Carrilero",
  lib: "Libero",
  líbero: "Libero",
  // Centrocampo
  med: "Centrocampista",
  mc: "Centrocampista",
  cm: "Centrocampista",
  mcd: "Centrocampista defensivo",
  mco: "Centrocampista ofensivo",
  int: "Interior",
  interior: "Interior",
  ext: "Extremo",
  extremo: "Extremo",
  ei: "Extremo izquierdo",
  ed: "Extremo derecho",
  // Delantero
  del: "Delantero",
  delantero: "Delantero",
  ata: "Delantero",
  att: "Delantero",
  fw: "Delantero",
  st: "Delantero centro",
  cf: "Delantero centro",
  "9": "Delantero centro",
};

function softTitle(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toLocaleUpperCase("es") + t.slice(1).toLocaleLowerCase("es");
}

export function expandFootballPositionForDisplay(position: string | null | undefined): string {
  const raw = position?.trim();
  if (!raw) return "—";

  const key = raw.toLowerCase().replace(/\s+/g, " ");
  if (ABBR[key]) return ABBR[key];

  const firstToken = key.split(/[\s,/]+/)[0] ?? key;
  if (firstToken && ABBR[firstToken]) {
    return ABBR[firstToken];
  }

  return softTitle(raw);
}

/** Usa mapa de fútbol salvo otros deportes (p. ej. básquet: solo capitaliza). */
export function expandRosterPositionForDisplay(
  position: string | null | undefined,
  sportCode?: string | null,
): string {
  const code = (sportCode ?? "").trim().toLowerCase();
  if (code.startsWith("basket") || code === "basketball" || code === "basket") {
    const raw = position?.trim();
    return raw ? softTitle(raw) : "—";
  }
  return expandFootballPositionForDisplay(position);
}
