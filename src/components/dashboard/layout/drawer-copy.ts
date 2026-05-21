import type { DashboardDrawerState } from "@/components/dashboard/hooks/dashboard-drawer-types";

export function drawerTitle(drawer: DashboardDrawerState): string {
  switch (drawer.kind) {
    case "closed":
      return "";
    case "new-league":
      return "Nueva liga";
    case "new-category":
      return "Nueva categoría";
    case "edit-category":
      return "Editar categoría";
    case "new-match":
      return "Nuevo partido";
    case "edit-match":
      return "Editar partido";
    case "edit-team":
      return "Editar equipo";
    case "register-player":
      return "Agregar jugador";
    case "edit-player":
      return "Editar jugador";
    case "player-sheet":
      return "Ficha técnica";
    case "new-venue":
      return "Nueva cancha";
    case "new-referee":
      return "Nuevo árbitro";
    case "edit-venue":
      return "Editar cancha";
    case "register-team":
      return "Registrar equipo";
    default:
      return "";
  }
}

export function drawerDescription(drawer: DashboardDrawerState): string {
  switch (drawer.kind) {
    case "closed":
      return "";
    case "new-league":
      return "Completá los datos; el escudo es opcional. Se usa Idempotency-Key para evitar duplicados si la red falla.";
    case "new-category":
      return "La categoría queda en league_categories y se ordena al final (sort_order).";
    case "edit-category":
      return "Nombre, género y reglas deportivas. El code y la liga no se modifican.";
    case "new-match":
      return "Alta en matches: temporada, equipos inscritos (season_teams), fecha/hora y cancha opcional.";
    case "edit-match":
      return "Actualizá fecha, equipos, fase, cancha o notas; se validan las mismas reglas que al programar.";
    case "edit-team":
      return "Modificá categoría, contactos, estado o escudo. La liga no se cambia desde acá.";
    case "register-player":
      return "Selecciona el equipo y captura los datos. CURP (texto), escaneo, foto y WhatsApp son opcionales.";
    case "edit-player":
      return "Nombre, nacimiento, dorsal, posición, CURP y WhatsApp. Nueva foto o escaneo de CURP opcional.";
    case "player-sheet":
      return "Perfil visual con estadísticas acumuladas en esta liga (todas las temporadas con partidos registrados).";
    case "new-venue":
      return "Nombre, dirección y superficie obligatorios. Fotos y disponibilidad opcionales; se guardan en venues (metadata) y Storage.";
    case "new-referee":
      return "Directorio en league_referees: contacto y foto opcional en Storage (misma convención que jugadores).";
    case "edit-venue":
      return "Actualizá datos y superficie; podés sumar fotos o quitar todas. La liga no se cambia desde acá.";
    case "register-team":
      return "Elegí liga y categoría, datos del dirigente y contacto adicional. El escudo es opcional.";
    default:
      return "";
  }
}
