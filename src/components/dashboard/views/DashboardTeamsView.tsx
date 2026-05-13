"use client";

import { useEffect, useRef, useState } from "react";

import {
  TeamsFilterableTable,
  type TeamsFilterableTableHandle,
} from "@/components/dashboard/tables/teams-filterable-table";
import type { MyLeaguesTeamRow } from "../leagues/my-leagues-state";
import { DashboardViewHeader } from "./dashboard-view-primitives";

export function DashboardTeamsView({
  teamRows,
  onOpenRegisterTeamDrawer,
  onOpenEditTeamDrawer,
}: {
  teamRows: readonly MyLeaguesTeamRow[];
  onOpenRegisterTeamDrawer: () => void;
  onOpenEditTeamDrawer: (args: { leagueId: string; teamId: string }) => void;
}) {
  const tableRef = useRef<TeamsFilterableTableHandle>(null);
  const [canClearTable, setCanClearTable] = useState(false);

  useEffect(() => {
    if (teamRows.length === 0) {
      setCanClearTable(false);
    }
  }, [teamRows.length]);

  return (
    <>
      <DashboardViewHeader
        title="Equipos"
        hint="Todos los clubes de tus ligas. Datos desde `teams` y categoría / plantilla por temporada en `season_teams`."
        actions={
          <>
            <button
              type="button"
              disabled={!canClearTable}
              title={
                canClearTable
                  ? "Quita filtros de columnas y restablece el orden (Equipo A→Z, ascendente)"
                  : "No hay filtros ni cambios de orden que limpiar"
              }
              onClick={() => tableRef.current?.clearAllFilters()}
              className="border-border bg-background-muted/50 text-foreground cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Borrar filtros
            </button>
            <button
              type="button"
              onClick={onOpenRegisterTeamDrawer}
              className="cursor-pointer rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95"
            >
              Registrar equipo
            </button>
          </>
        }
      />
      {teamRows.length === 0 ? (
        <p className="text-foreground-muted text-sm">
          Todavía no hay equipos registrados. Usa &quot;Registrar equipo&quot; para agregar el primero.
        </p>
      ) : (
        <TeamsFilterableTable
          ref={tableRef}
          teamRows={teamRows}
          onEditTeam={onOpenEditTeamDrawer}
          onHasActiveFiltersChange={setCanClearTable}
        />
      )}
    </>
  );
}
