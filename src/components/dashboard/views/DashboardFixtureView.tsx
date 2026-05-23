"use client";

import { useEffect, useRef, useState } from "react";

import type { MyLeaguesMatchRow } from "@/components/dashboard/leagues/my-leagues-state";
import {
  MatchesFilterableTable,
  type MatchesFilterableTableHandle,
} from "@/components/dashboard/tables/matches-filterable-table";
import { MatchRecapFullscreen } from "@/components/dashboard/match-recap/MatchRecapFullscreen";

import {
  DashboardViewHeader,
  MockActionButton,
} from "./dashboard-view-primitives";

type MatchesLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: MyLeaguesMatchRow[] };

export function DashboardFixtureView({
  hasManagedLeagues,
  fixtureDataRefreshKey,
  onOpenNewMatchDrawer,
  onOpenEditMatchDrawer,
}: {
  hasManagedLeagues: boolean;
  /** Se incrementa al invalidar datos del panel (p. ej. tras crear partido). */
  fixtureDataRefreshKey: number;
  onOpenNewMatchDrawer: () => void;
  onOpenEditMatchDrawer: (row: MyLeaguesMatchRow) => void;
}) {
  const tableRef = useRef<MatchesFilterableTableHandle>(null);
  const [canClearTable, setCanClearTable] = useState(false);
  const [matchesState, setMatchesState] = useState<MatchesLoadState>({ status: "idle" });
  const [recapMatch, setRecapMatch] = useState<MyLeaguesMatchRow | null>(null);

  useEffect(() => {
    if (!hasManagedLeagues) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setMatchesState({ status: "loading" });

      try {
        const res = await fetch("/api/leagues/my/matches", { method: "GET" });
        if (cancelled) return;
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        if (!res.ok) {
          setMatchesState({
            status: "error",
            message: "No se pudieron cargar los partidos. Intenta de nuevo.",
          });
          return;
        }
        const data = (await res.json()) as { matches?: MyLeaguesMatchRow[] };
        if (cancelled) return;
        const raw = data.matches ?? [];
        setMatchesState({
          status: "ready",
          rows: raw.map((m) => ({
            ...m,
            notes: m.notes ?? null,
            leagueRefereeId: m.leagueRefereeId ?? null,
            leagueRefereeFullName: m.leagueRefereeFullName ?? null,
          })),
        });
      } catch {
        if (!cancelled) {
          setMatchesState({
            status: "error",
            message: "No se pudieron cargar los partidos. Intenta de nuevo.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasManagedLeagues, fixtureDataRefreshKey]);

  const rows = matchesState.status === "ready" ? matchesState.rows : [];
  const tableVisible = hasManagedLeagues && matchesState.status === "ready" && rows.length > 0;
  const borrarFiltrosEnabled = tableVisible && canClearTable;

  return (
    <>
      <DashboardViewHeader
        title="Fixture y jornadas"
        hint="Partidos en `matches` por temporada (`season_id`); equipos validados con `season_teams`. Datos en vivo desde tu liga."
        actions={
          <>
            <button
              type="button"
              disabled={!borrarFiltrosEnabled}
              title={
                borrarFiltrosEnabled
                  ? "Quita filtros de columnas y restablece el orden (fecha: más próximos primero)"
                  : "No hay filtros ni cambios de orden que limpiar"
              }
              onClick={() => tableRef.current?.clearAllFilters()}
              className="border-border bg-background-muted/50 text-foreground cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Borrar filtros
            </button>
            <MockActionButton variant="secondary">Semana anterior</MockActionButton>
            <MockActionButton variant="secondary">Semana siguiente</MockActionButton>
            <button
              type="button"
              onClick={onOpenNewMatchDrawer}
              disabled={!hasManagedLeagues}
              title={hasManagedLeagues ? undefined : "Primero crea una liga"}
              className="cursor-pointer rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Nuevo partido
            </button>
          </>
        }
      />

      {!hasManagedLeagues ? (
        <p className="text-foreground-muted text-sm">
          Cuando tengas una liga, aquí verás el calendario de partidos.
        </p>
      ) : matchesState.status === "loading" ? (
        <p className="text-foreground-muted text-sm">Cargando partidos…</p>
      ) : matchesState.status === "error" ? (
        <p className="text-brand-purple text-sm">{matchesState.message}</p>
      ) : rows.length === 0 ? (
        <p className="text-foreground-muted text-sm">
          Aún no hay partidos registrados. Usa &quot;Nuevo partido&quot; para programar el primero.
        </p>
      ) : (
        <MatchesFilterableTable
          ref={tableRef}
          matchRows={rows}
          onHasActiveFiltersChange={setCanClearTable}
          onEditMatch={onOpenEditMatchDrawer}
          onViewMatchRecap={setRecapMatch}
        />
      )}

      {recapMatch ? (
        <MatchRecapFullscreen row={recapMatch} onClose={() => setRecapMatch(null)} />
      ) : null}

      {tableVisible ? (
        <div className="mt-3 flex justify-end">
          <MockActionButton variant="ghost" className="!text-xs">
            Exportar PDF
          </MockActionButton>
        </div>
      ) : null}
    </>
  );
}
