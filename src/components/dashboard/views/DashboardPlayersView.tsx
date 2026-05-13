"use client";

import { useRef, useState } from "react";

import {
  PlayersFilterableTable,
  type PlayersFilterableTableHandle,
} from "@/components/dashboard/tables/players-filterable-table";
import type { MyLeaguesPlayerRow } from "../leagues/my-leagues-state";
import { DashboardViewHeader } from "./dashboard-view-primitives";

export function DashboardPlayersView({
  playerRows,
  playersNextCursor,
  onLoadMorePlayers,
  playersLoadingMore,
  hasTeams,
  onOpenRegisterPlayerDrawer,
  onOpenPlayerSheetDrawer,
}: {
  playerRows: readonly MyLeaguesPlayerRow[];
  playersNextCursor: string | null;
  onLoadMorePlayers?: () => Promise<{
    ok: boolean;
    playerCount: number;
    hasMore: boolean;
  } | null>;
  playersLoadingMore?: boolean;
  hasTeams: boolean;
  onOpenRegisterPlayerDrawer: (args?: { prefillTeamId?: string }) => void;
  onOpenPlayerSheetDrawer: (args: {
    leagueId: string;
    teamId: string;
    playerId: string;
  }) => void;
}) {
  const tableRef = useRef<PlayersFilterableTableHandle>(null);
  const [canClearTable, setCanClearTable] = useState(false);
  const showPlayerTable = hasTeams && playerRows.length > 0;
  const borrarFiltrosEnabled = showPlayerTable && canClearTable;

  return (
    <>
      <DashboardViewHeader
        title="Plantillas y jugadores"
        hint="Alineaciones, camisetas y datos de `players` — validar roster por `season_teams`."
        actions={
          <>
            <button
              type="button"
              disabled={!borrarFiltrosEnabled}
              title={
                borrarFiltrosEnabled
                  ? "Quita filtros de columnas y restablece el orden (Alta más reciente primero)"
                  : "No hay filtros ni cambios de orden que limpiar"
              }
              onClick={() => tableRef.current?.clearAllFilters()}
              className="border-border bg-background-muted/50 text-foreground cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Borrar filtros
            </button>
            <button
              type="button"
              onClick={() => onOpenRegisterPlayerDrawer()}
              disabled={!hasTeams}
              title={hasTeams ? undefined : "Primero crea un equipo"}
              className="cursor-pointer rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Agregar jugador
            </button>
          </>
        }
      />
      {!hasTeams ? (
        <p className="text-foreground-muted text-sm">
          Primero registrá un equipo en la sección Equipos; después podés agregar jugadores a la plantilla.
        </p>
      ) : playerRows.length === 0 ? (
        <p className="text-foreground-muted text-sm">
          No hay jugadores en plantilla para la temporada actual de tus ligas. Usá &quot;Agregar jugador&quot;
          para incorporar el primero.
        </p>
      ) : (
        <PlayersFilterableTable
          ref={tableRef}
          playerRows={playerRows}
          playersNextCursor={playersNextCursor}
          onLoadMorePlayers={onLoadMorePlayers}
          loadingMorePlayers={playersLoadingMore}
          onViewPlayerSheet={onOpenPlayerSheetDrawer}
          onHasActiveFiltersChange={setCanClearTable}
        />
      )}
    </>
  );
}
