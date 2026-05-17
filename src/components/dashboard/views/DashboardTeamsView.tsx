"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  TeamsFilterableTable,
  type TeamsFilterableTableHandle,
} from "@/components/dashboard/tables/teams-filterable-table";
import { TeamRosterPanel } from "@/components/dashboard/tables/team-roster-panel";
import type { MyLeaguesPlayerRow, MyLeaguesTeamRow } from "../leagues/my-leagues-state";
import { DashboardViewHeader } from "./dashboard-view-primitives";

export function DashboardTeamsView({
  teamRows,
  teamsNextCursor,
  onLoadMoreTeams,
  teamsLoadingMore,
  onOpenRegisterTeamDrawer,
  onOpenEditTeamDrawer,
  onOpenPlayerSheetDrawer,
}: {
  teamRows: readonly MyLeaguesTeamRow[];
  teamsNextCursor: string | null;
  onLoadMoreTeams?: () => Promise<{
    ok: boolean;
    teamCount: number;
    hasMore: boolean;
  } | null>;
  teamsLoadingMore?: boolean;
  onOpenRegisterTeamDrawer: () => void;
  onOpenEditTeamDrawer: (args: { leagueId: string; teamId: string }) => void;
  onOpenPlayerSheetDrawer: (args: {
    leagueId: string;
    teamId: string;
    playerId: string;
  }) => void;
}) {
  const tableRef = useRef<TeamsFilterableTableHandle>(null);
  const [canClearTable, setCanClearTable] = useState(false);

  const [rosterTeam, setRosterTeam] = useState<MyLeaguesTeamRow | null>(null);
  const [rosterRows, setRosterRows] = useState<MyLeaguesPlayerRow[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  useEffect(() => {
    if (teamRows.length === 0) {
      setCanClearTable(false);
    }
  }, [teamRows.length]);

  const loadRoster = useCallback(async (team: MyLeaguesTeamRow) => {
    if (rosterTeam?.id === team.id) {
      setRosterTeam(null);
      setRosterRows([]);
      setRosterError(null);
      return;
    }

    setRosterTeam(team);
    setRosterRows([]);
    setRosterError(null);
    setRosterLoading(true);
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(team.leagueId)}/teams/${encodeURIComponent(team.id)}/roster`,
      );
      let data: { roster?: MyLeaguesPlayerRow[]; error?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        /* ignore */
      }
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (!res.ok) {
        setRosterError(
          typeof data.error === "string" ? data.error : "No se pudo cargar la plantilla.",
        );
        return;
      }
      setRosterRows(data.roster ?? []);
    } catch {
      setRosterError("Error de red al cargar la plantilla.");
    } finally {
      setRosterLoading(false);
    }
  }, [rosterTeam?.id]);

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
        <>
          <TeamsFilterableTable
            ref={tableRef}
            teamRows={teamRows}
            teamsNextCursor={teamsNextCursor}
            onLoadMoreTeams={onLoadMoreTeams}
            loadingMoreTeams={teamsLoadingMore}
            onEditTeam={onOpenEditTeamDrawer}
            selectedTeamId={rosterTeam?.id ?? null}
            onShowTeamRoster={(team) => void loadRoster(team)}
            onHasActiveFiltersChange={setCanClearTable}
          />
          {rosterTeam ? (
            <TeamRosterPanel
              team={rosterTeam}
              roster={rosterRows}
              loading={rosterLoading}
              error={rosterError}
              onClose={() => {
                setRosterTeam(null);
                setRosterRows([]);
                setRosterError(null);
              }}
              onViewPlayerSheet={onOpenPlayerSheetDrawer}
            />
          ) : null}
        </>
      )}
    </>
  );
}
