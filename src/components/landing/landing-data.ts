export const LANDING_SLOGAN = "Organiza. Compite. Conecta.";

export const LANDING_SPORTS = [
  "Liga varonil",
  "Liga femenil",
  "Fútbol 7",
  "Fútbol 11",
  "Juvenil",
  "Veteranos",
] as const;

/** Etiquetas del rail del panel (`dashboard-nav-config`) para el pie del bento */
export const LANDING_PANEL_AREAS = [
  "Ligas",
  "Fixture",
  "En vivo",
  "Equipos",
  "Plantillas",
  "Sedes",
  "Clasificación",
  "Marcador",
  "Resultados",
  "Estadísticas",
  "Disciplina",
  "Actas",
] as const;

export const LANDING_FEATURES = [
  {
    id: "leagues",
    navLabel: "Ligas",
    title: "Ligas, torneos y categorías",
    description:
      "Temporadas, ramas, divisiones y reglas competitivas en un solo lugar, alineadas con tu organización.",
    accent: "from-brand-blue/20 to-brand-purple/10",
  },
  {
    id: "fixture",
    navLabel: "Fixture",
    title: "Calendario de jornadas",
    description:
      "Programa partidos, horarios, canchas y árbitros. Cada jornada queda lista para publicar.",
    accent: "from-brand-lime/12 to-brand-teal/10",
  },
  {
    id: "live",
    navLabel: "En vivo",
    title: "Marcador y partido en vivo",
    description:
      "Sigue el marcador, incidencias y goles mientras se juega, sin depender de chats o capturas.",
    accent: "from-brand-purple/18 to-brand-blue/10",
  },
  {
    id: "rosters",
    navLabel: "Equipos · Plantillas",
    title: "Clubes y plantillas listos",
    description:
      "Equipos, dorsales, posiciones, documentos y fichas técnicas con un expediente claro por jugador.",
    accent: "from-brand-teal/16 to-brand-lime/8",
  },
  {
    id: "venues",
    navLabel: "Sedes",
    title: "Canchas y sedes",
    description:
      "Administra polideportivos, canchas disponibles y responsables de sede para armar el fixture.",
    accent: "from-brand-blue/14 to-brand-teal/8",
  },
  {
    id: "standings",
    navLabel: "Tabla",
    title: "Clasificación al día",
    description:
      "Publica resultados y mantén la tabla actualizada para jugadores, clubes y organizadores.",
    accent: "from-brand-lime/14 to-brand-blue/10",
  },
  {
    id: "stats",
    navLabel: "Estadísticas",
    title: "Goleadores, asistencias y fichas",
    description:
      "Máximo goleador, anotadores, asistencias, tarjetas y expediente por jugador. Los números salen de los partidos que registras.",
    accent: "from-brand-purple/16 to-brand-lime/12",
    gridClass: "lg:col-start-2 xl:col-start-auto",
  },
] as const;

export const LANDING_STATS = [
  { value: "1 panel", label: "Ligas, categorías, partidos y resultados conectados" },
  { value: "Plantillas", label: "Posiciones, documentos y ficha técnica por jugador" },
  { value: "24/7", label: "Calendario, resultados y tabla cuando tu liga los necesita" },
] as const;

export const LANDING_STEPS = [
  {
    step: "01",
    title: "Configura la competencia",
    body: "Define liga, temporada, categorías, canchas y reglas para que todos jueguen con el mismo sistema.",
  },
  {
    step: "02",
    title: "Arma la jornada",
    body: "Carga equipos, jugadores, árbitros, sedes y horarios. El calendario queda listo para salir.",
  },
  {
    step: "03",
    title: "Publica resultados",
    body: "Actualiza marcadores, tabla y actividad reciente para que jugadores y organizadores sigan la liga.",
  },
] as const;

export const MATCHDAY_EVENTS = [
  { minute: "18'", event: "Gol Deportivo Norte", score: "1-0" },
  { minute: "42'", event: "Tarjeta amarilla Central FC", score: "1-0" },
  { minute: "67'", event: "Empate Atlético Sur", score: "1-1" },
] as const;

export const TABLE_PREVIEW = [
  { pos: "1", club: "Deportivo Norte", pts: "28" },
  { pos: "2", club: "Atlético Sur", pts: "26" },
  { pos: "3", club: "Central FC", pts: "23" },
] as const;
