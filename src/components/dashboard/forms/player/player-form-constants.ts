/** Posiciones fútbol 5 / futbolito (texto libre en `team_rosters.position`). */
export const PLAYER_POSITION_PRESETS = [
  { value: "POR", label: "Portero (POR)" },
  { value: "DEF", label: "Defensa (DEF)" },
  { value: "MED", label: "Medio (MED)" },
  { value: "DEL", label: "Delantero (DEL)" },
  { value: "POL", label: "Polivalente / Comodín (POL)" },
] as const;

export const POSITION_OTHER_VALUE = "__other__";
