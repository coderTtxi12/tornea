"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MyLeaguesMatchRow } from "@/components/dashboard/leagues/my-leagues-state";
import {
  MatchesFilterableTable,
  type MatchesFilterableTableFacets,
  type MatchesFilterableTableHandle,
  type MatchesTableSortState,
  MATCHES_TABLE_DEFAULT_SORT,
  type MatchTableFilterColumn,
} from "@/components/dashboard/tables/matches-filterable-table";
import {
  DashboardViewHeader,
  MockActionButton,
} from "./dashboard-view-primitives";

const PAGE_SIZE = 20;

type FacetsState =
  | { status: "idle" }
  | { status: "ready"; data: MatchesFilterableTableFacets }
  | { status: "error" };

type ListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: MyLeaguesMatchRow[]; total: number };

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function DashboardFixtureView({
  hasManagedLeagues,
  fixtureDataRefreshKey,
  onOpenNewMatchDrawer,
}: {
  hasManagedLeagues: boolean;
  /** Se incrementa al invalidar datos del panel (p. ej. tras crear partido). */
  fixtureDataRefreshKey: number;
  onOpenNewMatchDrawer: () => void;
}) {
  const tableRef = useRef<MatchesFilterableTableHandle>(null);
  const [canClearTable, setCanClearTable] = useState(false);

  const [facetsState, setFacetsState] = useState<FacetsState>({ status: "idle" });
  const [listState, setListState] = useState<ListState>({ status: "idle" });

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<MatchesTableSortState>(MATCHES_TABLE_DEFAULT_SORT);
  const [filterLeague, setFilterLeague] = useState<string[]>([]);
  const [filterSeason, setFilterSeason] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);

  const buildListQuery = useCallback(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("pageSize", String(PAGE_SIZE));
    p.set("sort", sort.key);
    p.set("dir", sort.dir);
    for (const x of filterLeague) p.append("league", x);
    for (const x of filterSeason) p.append("season", x);
    for (const x of filterStatus) p.append("status", x);
    for (const x of filterCategory) p.append("category", x);
    return p.toString();
  }, [page, sort, filterLeague, filterSeason, filterStatus, filterCategory]);

  useEffect(() => {
    if (!hasManagedLeagues) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setFacetsState({ status: "idle" });
      setListState({ status: "loading" });

      try {
        const [facRes, listRes] = await Promise.all([
          fetch("/api/leagues/my/matches/facets", { method: "GET" }),
          fetch(`/api/leagues/my/matches?${buildListQuery()}`, { method: "GET" }),
        ]);

        if (cancelled) return;

        if (facRes.status === 401 || listRes.status === 401) {
          window.location.href = "/";
          return;
        }

        if (!facRes.ok) {
          setFacetsState({ status: "error" });
        } else {
          const facJson = (await facRes.json()) as MatchesFilterableTableFacets;
          if (!cancelled) {
            setFacetsState({
              status: "ready",
              data: {
                leagueNames: Array.isArray(facJson.leagueNames) ? facJson.leagueNames : [],
                seasonNames: Array.isArray(facJson.seasonNames) ? facJson.seasonNames : [],
                statuses: Array.isArray(facJson.statuses) ? facJson.statuses : [],
                categoryLabels: Array.isArray(facJson.categoryLabels)
                  ? facJson.categoryLabels
                  : [],
              },
            });
          }
        }

        if (!listRes.ok) {
          if (!cancelled) {
            setListState({
              status: "error",
              message: "No se pudieron cargar los partidos. Intenta de nuevo.",
            });
          }
          return;
        }

        const listJson = (await listRes.json()) as {
          matches?: MyLeaguesMatchRow[];
          total?: number;
        };
        if (cancelled) return;
        const listTotal = typeof listJson.total === "number" ? listJson.total : 0;
        const maxP = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));
        setPage((p) => Math.min(p, maxP));
        setListState({
          status: "ready",
          rows: Array.isArray(listJson.matches) ? listJson.matches : [],
          total: listTotal,
        });
      } catch {
        if (!cancelled) {
          setFacetsState({ status: "error" });
          setListState({
            status: "error",
            message: "No se pudieron cargar los partidos. Intenta de nuevo.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasManagedLeagues, fixtureDataRefreshKey, buildListQuery]);

  const handleToggleFilter = useCallback((column: MatchTableFilterColumn, value: string) => {
    setPage(1);
    if (column === "league") {
      setFilterLeague((prev) => toggleInList(prev, value));
    } else if (column === "season") {
      setFilterSeason((prev) => toggleInList(prev, value));
    } else if (column === "status") {
      setFilterStatus((prev) => toggleInList(prev, value));
    } else {
      setFilterCategory((prev) => toggleInList(prev, value));
    }
  }, []);

  const handleClearColumnFilter = useCallback((column: MatchTableFilterColumn) => {
    setPage(1);
    if (column === "league") setFilterLeague([]);
    else if (column === "season") setFilterSeason([]);
    else if (column === "status") setFilterStatus([]);
    else setFilterCategory([]);
  }, []);

  const handleClearAll = useCallback(() => {
    setFilterLeague([]);
    setFilterSeason([]);
    setFilterStatus([]);
    setFilterCategory([]);
    setSort(MATCHES_TABLE_DEFAULT_SORT);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((next: MatchesTableSortState) => {
    setSort(next);
    setPage(1);
  }, []);

  const rows = listState.status === "ready" ? listState.rows : [];
  const total = listState.status === "ready" ? listState.total : 0;
  const hasFilters =
    filterLeague.length +
      filterSeason.length +
      filterStatus.length +
      filterCategory.length >
    0;
  const showTable =
    hasManagedLeagues &&
    listState.status === "ready" &&
    facetsState.status === "ready" &&
    (total > 0 || hasFilters);
  const borrarFiltrosEnabled = showTable && canClearTable;

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
      ) : listState.status === "loading" || facetsState.status === "idle" ? (
        <p className="text-foreground-muted text-sm">Cargando partidos…</p>
      ) : listState.status === "error" ? (
        <p className="text-brand-purple text-sm">{listState.message}</p>
      ) : facetsState.status === "error" ? (
        <p className="text-brand-purple text-sm">
          No se pudieron cargar las opciones de filtro. Recarga la página.
        </p>
      ) : total === 0 && !hasFilters ? (
        <p className="text-foreground-muted text-sm">
          Aún no hay partidos registrados. Usa &quot;Nuevo partido&quot; para programar el primero.
        </p>
      ) : facetsState.status === "ready" ? (
        <MatchesFilterableTable
          ref={tableRef}
          matchRows={rows}
          facets={facetsState.data}
          totalCount={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          sort={sort}
          onSortChange={handleSortChange}
          filterLeague={filterLeague}
          filterSeason={filterSeason}
          filterStatus={filterStatus}
          filterCategory={filterCategory}
          onToggleFilter={handleToggleFilter}
          onClearColumnFilter={handleClearColumnFilter}
          onRequestClearAll={handleClearAll}
          onHasActiveFiltersChange={setCanClearTable}
        />
      ) : null}

      {showTable ? (
        <div className="mt-3 flex justify-end">
          <MockActionButton variant="ghost" className="!text-xs">
            Exportar PDF
          </MockActionButton>
        </div>
      ) : null}
    </>
  );
}
