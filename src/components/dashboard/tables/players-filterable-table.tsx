"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * Tabla de plantillas / jugadores del dashboard (`MyLeaguesPlayerRow`).
 * Misma UX que `teams-filterable-table` (filtros en portal, chips, orden, borrar desde la vista).
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import type { MyLeaguesPlayerRow } from "@/components/dashboard/leagues/my-leagues-state";
import { floatCard } from "@/components/dashboard/views/dashboard-view-primitives";

export const PLAYERS_FILTERABLE_TABLE_TRIGGER_ATTR = "data-players-filterable-trigger";

function clubCode(p: MyLeaguesPlayerRow): string {
  if (p.teamShort?.trim()) return p.teamShort.trim().toUpperCase();
  return (
    p.teamName
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 4) || "—"
  );
}

function positionLabel(p: MyLeaguesPlayerRow): string {
  const s = p.position?.trim();
  return s && s.length > 0 ? s : "—";
}

function playerNameInitial(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "?";
  const first = [...t][0];
  return first ? first.toLocaleUpperCase("es") : "?";
}

function PlayerAvatarCell({ row }: { row: MyLeaguesPlayerRow }) {
  const url = row.profileImageUrl?.trim() ?? "";
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setBroken(false));
  }, [url]);

  const showPhoto = url.length > 0 && !broken;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {showPhoto ? (
        <span className="bg-muted ring-border relative size-8 shrink-0 overflow-hidden rounded-full ring-1">
          {/* External Storage URLs — usar <img> sin dominios en next/image */}
          <img
            src={url}
            alt=""
            className="size-full object-cover object-center"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
          />
        </span>
      ) : (
        <span
          className="bg-brand-teal/15 text-brand-teal ring-border flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1"
          aria-hidden
        >
          {playerNameInitial(row.fullName)}
        </span>
      )}
      <span className="truncate font-medium">{row.fullName}</span>
    </div>
  );
}

type FilterColumn = "league" | "club" | "position";

function formatRegisteredAtShort(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const UI_PAGE_SIZE = 20;

type SortKey = "name" | "shirt" | "added";

type SortState = { key: SortKey; dir: "asc" | "desc" };

const DEFAULT_SORT: SortState = { key: "added", dir: "desc" };

function isDefaultSort(s: SortState): boolean {
  return s.key === DEFAULT_SORT.key && s.dir === DEFAULT_SORT.dir;
}

const tableHeaderBtnClass =
  "group inline-flex flex-nowrap items-center gap-[0.35rem] rounded-md border-0 bg-transparent py-[0.15rem] px-[0.2rem] text-left text-[11px] font-bold tracking-wide uppercase text-foreground-muted transition-[color,background-color] duration-100 ease-out hover:bg-brand-teal/[0.08] hover:text-brand-teal";

function SortDirGlyphs({
  activeColumn,
  dir,
  column,
}: {
  activeColumn: SortKey;
  dir: "asc" | "desc";
  column: SortKey;
}) {
  const on = activeColumn === column;
  const idle = "text-[#d1d5db] transition-colors group-hover:text-brand-teal/50";
  const active = "text-brand-teal";
  return (
    <span
      className="inline-flex flex-row items-center gap-[0.12rem] text-[0.72rem] font-black leading-none tracking-normal"
      aria-hidden
    >
      <span className={on && dir === "asc" ? active : idle}>↑</span>
      <span className={on && dir === "desc" ? active : idle}>↓</span>
    </span>
  );
}

function IconFilter({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-3.5 shrink-0 transition-colors ${
        active ? "text-brand-teal" : "text-foreground-muted group-hover:text-brand-teal"
      }`}
      aria-hidden
    >
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function removeTagFromSet(
  setter: React.Dispatch<React.SetStateAction<Set<string>>>,
  value: string,
) {
  setter((prev) => {
    const next = new Set(prev);
    next.delete(value);
    return next;
  });
}

function selectedTagsChips(
  selected: Set<string>,
  setter: React.Dispatch<React.SetStateAction<Set<string>>>,
  columnLabel: string,
) {
  if (selected.size === 0) return null;
  const sorted = [...selected].sort((a, b) => a.localeCompare(b, "es"));
  return (
    <div
      className="mt-1.5 flex flex-wrap gap-1"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {sorted.map((tag) => (
        <span
          key={tag}
          className="border-brand-teal/30 bg-brand-teal/12 text-foreground inline-flex max-w-full items-center gap-1 rounded-md border py-1 pl-2 pr-0.5 text-[11px] font-semibold tracking-tight"
        >
          <span className="min-w-0 truncate" title={tag}>
            {tag}
          </span>
          <button
            type="button"
            className="text-foreground-muted hover:text-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-0.5 text-[11px] font-semibold leading-none tracking-tight transition-colors hover:bg-brand-teal/20"
            aria-label={`Quitar filtro ${columnLabel}: ${tag}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              removeTagFromSet(setter, tag);
            }}
          >
            X
          </button>
        </span>
      ))}
    </div>
  );
}

function cmpShirt(a: number | null, b: number | null, dir: "asc" | "desc"): number {
  const aNull = a == null;
  const bNull = b == null;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  const v = a - b;
  return dir === "asc" ? v : -v;
}

function cmpAdded(isoA: string, isoB: string, dir: "asc" | "desc"): number {
  const a = Date.parse(isoA);
  const b = Date.parse(isoB);
  const aNaN = Number.isNaN(a);
  const bNaN = Number.isNaN(b);
  if (aNaN && bNaN) return 0;
  if (aNaN) return 1;
  if (bNaN) return -1;
  const v = a - b;
  return dir === "asc" ? v : -v;
}

export type PlayersFilterableTableHandle = {
  clearAllFilters: () => void;
};

export type PlayersFilterableTableProps = {
  playerRows: readonly MyLeaguesPlayerRow[];
  /** Paginación servidor; `null` si ya no hay más bloques de hasta 50 filas. */
  playersNextCursor: string | null;
  /** Carga el siguiente bloque desde la API; debe actualizar el estado del padre antes de resolver. */
  onLoadMorePlayers?: () => Promise<{
    ok: boolean;
    playerCount: number;
    hasMore: boolean;
  } | null>;
  loadingMorePlayers?: boolean;
  /** Ficha técnica (slide separado del formulario de edición). */
  onViewPlayerSheet: (args: { leagueId: string; teamId: string; playerId: string }) => void;
  wrapperClassName?: string;
  onHasActiveFiltersChange?: (active: boolean) => void;
};

export const PlayersFilterableTable = forwardRef<
  PlayersFilterableTableHandle,
  PlayersFilterableTableProps
>(function PlayersFilterableTable(
  {
    playerRows,
    playersNextCursor,
    onLoadMorePlayers,
    loadingMorePlayers = false,
    onViewPlayerSheet,
    wrapperClassName,
    onHasActiveFiltersChange,
  },
  ref,
) {
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [filterLeague, setFilterLeague] = useState<Set<string>>(() => new Set());
  const [filterClub, setFilterClub] = useState<Set<string>>(() => new Set());
  const [filterPosition, setFilterPosition] = useState<Set<string>>(() => new Set());
  const [openFilter, setOpenFilter] = useState<FilterColumn | null>(null);
  const [filterAnchorRect, setFilterAnchorRect] = useState<DOMRect | null>(null);
  const portalMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const filterPanelRef = useRef<HTMLDivElement>(null);

  const closeFilter = useCallback(() => {
    setOpenFilter(null);
    setFilterAnchorRect(null);
  }, []);

  const hasActiveColumnFilters =
    filterLeague.size + filterClub.size + filterPosition.size > 0;
  const sortDiffersFromDefault = !isDefaultSort(sort);
  const canClearTableState = hasActiveColumnFilters || sortDiffersFromDefault;

  useEffect(() => {
    onHasActiveFiltersChange?.(canClearTableState);
  }, [canClearTableState, onHasActiveFiltersChange]);

  useImperativeHandle(
    ref,
    () => ({
      clearAllFilters: () => {
        setFilterLeague(new Set());
        setFilterClub(new Set());
        setFilterPosition(new Set());
        setSort(DEFAULT_SORT);
        setPage(1);
        closeFilter();
      },
    }),
    [closeFilter],
  );

  useEffect(() => {
    if (!openFilter) return;
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      const panel = filterPanelRef.current;
      if (panel?.contains(t)) return;
      if ((e.target as Element | null)?.closest?.(`[${PLAYERS_FILTERABLE_TABLE_TRIGGER_ATTR}]`))
        return;
      closeFilter();
    }
    function onScrollOrResize() {
      closeFilter();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [openFilter, closeFilter]);

  const optionSets = useMemo(() => {
    const leagues = new Set<string>();
    const clubs = new Set<string>();
    const positions = new Set<string>();
    for (const p of playerRows) {
      leagues.add(p.leagueName);
      clubs.add(clubCode(p));
      positions.add(positionLabel(p));
    }
    return {
      leagues: [...leagues].sort((a, b) => a.localeCompare(b, "es")),
      clubs: [...clubs].sort((a, b) => a.localeCompare(b, "es")),
      positions: [...positions].sort((a, b) => a.localeCompare(b, "es")),
    };
  }, [playerRows]);

  useEffect(() => {
    queueMicrotask(() => setPage(1));
  }, [filterLeague, filterClub, filterPosition]);

  const filteredSortedRows = useMemo(() => {
    let list = [...playerRows];

    if (filterLeague.size > 0) {
      list = list.filter((p) => filterLeague.has(p.leagueName));
    }
    if (filterClub.size > 0) {
      list = list.filter((p) => filterClub.has(clubCode(p)));
    }
    if (filterPosition.size > 0) {
      list = list.filter((p) => filterPosition.has(positionLabel(p)));
    }

    list.sort((a, b) => {
      if (sort.key === "name") {
        const cmp = a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base" });
        return sort.dir === "asc" ? cmp : -cmp;
      }
      if (sort.key === "shirt") {
        return cmpShirt(a.shirtNumber, b.shirtNumber, sort.dir);
      }
      return cmpAdded(a.registeredAt, b.registeredAt, sort.dir);
    });

    return list;
  }, [playerRows, sort, filterLeague, filterClub, filterPosition]);

  const filtersClear =
    filterLeague.size === 0 && filterClub.size === 0 && filterPosition.size === 0;

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredSortedRows.length / UI_PAGE_SIZE));
    queueMicrotask(() => setPage((p) => Math.min(p, maxPage)));
  }, [filteredSortedRows.length]);

  const totalFiltered = filteredSortedRows.length;
  const pageStart = (page - 1) * UI_PAGE_SIZE;
  const visibleRows = filteredSortedRows.slice(pageStart, pageStart + UI_PAGE_SIZE);

  const canGoNext =
    totalFiltered > page * UI_PAGE_SIZE ||
    (filtersClear && Boolean(playersNextCursor && onLoadMorePlayers));

  const goPrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goNextPage = useCallback(async () => {
    const targetPage = page + 1;
    const requiredCount = targetPage * UI_PAGE_SIZE;

    if (!filtersClear) {
      if (totalFiltered > page * UI_PAGE_SIZE) {
        setPage(targetPage);
      }
      return;
    }

    let count = totalFiltered;
    while (count < requiredCount && onLoadMorePlayers) {
      const r = await onLoadMorePlayers();
      if (!r?.ok) break;
      count = r.playerCount;
      if (!r.hasMore) break;
    }

    if (count > (targetPage - 1) * UI_PAGE_SIZE) {
      setPage(targetPage);
    }
  }, [
    page,
    totalFiltered,
    filtersClear,
    onLoadMorePlayers,
  ]);

  function toggleSortColumn(column: SortKey) {
    setPage(1);
    const dirDefaults: Record<SortKey, "asc" | "desc"> = {
      name: "asc",
      shirt: "asc",
      added: "desc",
    };
    setSort((s) => {
      if (s.key === column) return { key: column, dir: s.dir === "asc" ? "desc" : "asc" };
      return { key: column, dir: dirDefaults[column] };
    });
  }

  function toggleFilterValue(
    value: string,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
  ) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function clearColumnFilter(setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
    setter(new Set());
  }

  const filterPanelStyle = useMemo(() => {
    if (!filterAnchorRect || typeof window === "undefined") return null;
    const gap = 6;
    const panelWidth = Math.min(280, Math.max(220, window.innerWidth - 16));
    let left = filterAnchorRect.left;
    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - 8 - panelWidth;
    }
    if (left < 8) left = 8;
    let top = filterAnchorRect.bottom + gap;
    const maxH = Math.min(352, window.innerHeight * 0.65);
    if (top + maxH > window.innerHeight - 8) {
      top = Math.max(8, filterAnchorRect.top - gap - maxH);
    }
    return { top, left, width: panelWidth, maxHeight: maxH } as const;
  }, [filterAnchorRect]);

  function renderFilterPortal() {
    if (!portalMounted || !openFilter || !filterPanelStyle) return null;

    const col = openFilter;
    const options =
      col === "league" ? optionSets.leagues : col === "club" ? optionSets.clubs : optionSets.positions;
    const selected =
      col === "league" ? filterLeague : col === "club" ? filterClub : filterPosition;
    const setSelected =
      col === "league" ? setFilterLeague : col === "club" ? setFilterClub : setFilterPosition;

    return createPortal(
      <div
        ref={filterPanelRef}
        className="border-border bg-background fixed z-[100] flex flex-col overflow-hidden rounded-xl border shadow-xl"
        style={{
          top: filterPanelStyle.top,
          left: filterPanelStyle.left,
          width: filterPanelStyle.width,
          maxHeight: filterPanelStyle.maxHeight,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-2">
          <p className="text-foreground-muted mb-3 text-[13px] leading-snug">
            Selecciona una o varias. El jugador debe coincidir con{" "}
            <span className="text-foreground font-medium">al menos una</span> de las etiquetas de esta
            columna.
          </p>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
              const on = selected.has(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  className={
                    on
                      ? "border-brand-teal/45 bg-brand-teal/15 text-foreground hover:bg-brand-teal/25 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-tight transition-colors"
                      : "border-border bg-surface-code/35 text-foreground-muted hover:border-brand-teal/30 hover:bg-surface-code/55 rounded-full border px-3 py-1.5 text-xs font-medium tracking-tight transition-colors"
                  }
                  onClick={() => toggleFilterValue(opt, setSelected)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-border flex items-center justify-between gap-2 border-t px-3 py-2">
          {selected.size > 0 ? (
            <>
              <span className="text-foreground-subtle text-[11px]">
                {selected.size === 1 ? "1 etiqueta activa" : `${selected.size} etiquetas activas`}
              </span>
              <button
                type="button"
                className="text-foreground-muted hover:text-foreground text-xs font-medium underline-offset-4 hover:underline"
                onClick={() => clearColumnFilter(setSelected)}
              >
                Limpiar filtros
              </button>
            </>
          ) : (
            <span className="text-foreground-subtle text-[11px]">
              Sin selección = se muestran todos los jugadores
            </span>
          )}
        </div>
      </div>,
      document.body,
    );
  }

  function headerFilterColumn(col: FilterColumn, label: string, selected: Set<string>) {
    const colWord = col === "league" ? "liga" : col === "club" ? "club" : "posición";
    return (
      <button
        type="button"
        {...{ [PLAYERS_FILTERABLE_TABLE_TRIGGER_ATTR]: "" }}
        className={`${tableHeaderBtnClass} whitespace-nowrap`}
        aria-label={
          selected.size > 0
            ? `Filtrar por ${colWord}, ${selected.size} etiquetas activas`
            : `Filtrar por ${colWord}`
        }
        aria-expanded={openFilter === col}
        aria-haspopup="dialog"
        title={
          selected.size > 0
            ? `${label}: ${selected.size} filtro${selected.size === 1 ? "" : "s"} activo${selected.size === 1 ? "" : "s"}`
            : `Filtrar por ${colWord}`
        }
        onClick={(e) => {
          e.stopPropagation();
          const el = e.currentTarget;
          if (openFilter === col) {
            closeFilter();
          } else {
            setFilterAnchorRect(el.getBoundingClientRect());
            setOpenFilter(col);
          }
        }}
      >
        <span>{label}</span>
        <IconFilter active={selected.size > 0} />
      </button>
    );
  }

  const wrap = wrapperClassName ?? `${floatCard} overflow-x-auto`;

  return (
    <>
      <div className={wrap}>
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead>
            <tr className="text-foreground-muted border-border border-b text-[11px] font-bold tracking-wide uppercase">
              <th className="px-4 py-3 align-top">
                <button
                  type="button"
                  className={`${tableHeaderBtnClass} whitespace-nowrap`}
                  title={
                    sort.key === "shirt"
                      ? sort.dir === "asc"
                        ? "Número ascendente"
                        : "Número descendente"
                      : "Ordenar por dorsal"
                  }
                  aria-label={
                    sort.key === "shirt"
                      ? `Ordenar dorsal ${sort.dir === "asc" ? "ascendente" : "descendente"}`
                      : "Ordenar por número de camiseta"
                  }
                  onClick={() => toggleSortColumn("shirt")}
                >
                  <span>#</span>
                  <SortDirGlyphs activeColumn={sort.key} dir={sort.dir} column="shirt" />
                </button>
              </th>
              <th className="px-4 py-3 align-top">
                <button
                  type="button"
                  className={tableHeaderBtnClass}
                  title={
                    sort.key === "name"
                      ? sort.dir === "asc"
                        ? "Orden A → Z"
                        : "Orden Z → A"
                      : "Ordenar por nombre"
                  }
                  aria-label={
                    sort.key === "name"
                      ? `Ordenar jugador ${sort.dir === "asc" ? "ascendente" : "descendente"}`
                      : "Ordenar por nombre"
                  }
                  onClick={() => toggleSortColumn("name")}
                >
                  <span>Jugador</span>
                  <SortDirGlyphs activeColumn={sort.key} dir={sort.dir} column="name" />
                </button>
              </th>
              <th className="max-w-[14rem] px-4 py-3 align-top whitespace-normal">
                {headerFilterColumn("league", "Liga", filterLeague)}
                {selectedTagsChips(filterLeague, setFilterLeague, "Liga")}
              </th>
              <th className="max-w-[14rem] px-4 py-3 align-top whitespace-normal">
                {headerFilterColumn("club", "Club", filterClub)}
                {selectedTagsChips(filterClub, setFilterClub, "Club")}
              </th>
              <th className="max-w-[14rem] px-4 py-3 align-top whitespace-normal">
                {headerFilterColumn("position", "Pos.", filterPosition)}
                {selectedTagsChips(filterPosition, setFilterPosition, "Posición")}
              </th>
              <th className="px-4 py-3 align-top">
                <button
                  type="button"
                  className={`${tableHeaderBtnClass} whitespace-nowrap`}
                  title={
                    sort.key === "added"
                      ? sort.dir === "desc"
                        ? "Recientes primero"
                        : "Antiguos primero"
                      : "Ordenar por fecha de alta en plantilla"
                  }
                  aria-label={
                    sort.key === "added"
                      ? `Ordenar alta ${sort.dir === "desc" ? "más reciente primero" : "más antigua primero"}`
                      : "Ordenar por fecha de alta en plantilla"
                  }
                  onClick={() => toggleSortColumn("added")}
                >
                  <span>Alta</span>
                  <SortDirGlyphs activeColumn={sort.key} dir={sort.dir} column="added" />
                </button>
              </th>
              <th className="px-4 py-3 align-top" />
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {filteredSortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-foreground-muted px-4 py-6 text-center text-sm"
                >
                  Ningún jugador coincide con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              visibleRows.map((p) => (
                <tr
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  className="hover:bg-surface-code/20 cursor-pointer transition-colors"
                  onClick={() =>
                    onViewPlayerSheet({
                      leagueId: p.leagueId,
                      teamId: p.teamId,
                      playerId: p.playerId,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onViewPlayerSheet({
                        leagueId: p.leagueId,
                        teamId: p.teamId,
                        playerId: p.playerId,
                      });
                    }
                  }}
                >
                  <td className="text-foreground-muted px-4 py-2.5 tabular-nums">
                    {p.shirtNumber ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <PlayerAvatarCell row={p} />
                  </td>
                  <td className="text-foreground-muted px-4 py-2.5">{p.leagueName}</td>
                  <td className="text-foreground-muted px-4 py-2.5">{clubCode(p)}</td>
                  <td className="px-4 py-2.5">
                    <span className="border-border bg-surface-code/50 rounded-md border px-2 py-0.5 text-xs font-semibold">
                      {positionLabel(p)}
                    </span>
                  </td>
                  <td className="text-foreground-muted px-4 py-2.5 whitespace-nowrap tabular-nums">
                    {formatRegisteredAtShort(p.registeredAt ?? "")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      className="text-foreground-muted hover:text-foreground border border-transparent px-2 py-1 text-xs font-semibold underline-offset-4 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewPlayerSheet({
                          leagueId: p.leagueId,
                          teamId: p.teamId,
                          playerId: p.playerId,
                        });
                      }}
                    >
                      Ver ficha
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalFiltered > 0 ? (
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-foreground-muted text-[13px] leading-snug">
              Mostrando{" "}
              <span className="text-foreground font-semibold tabular-nums">
                {pageStart + 1}–{pageStart + visibleRows.length}
              </span>{" "}
              de{" "}
              <span className="text-foreground font-semibold tabular-nums">
                {totalFiltered}
                {filtersClear && playersNextCursor ? "+" : ""}
              </span>
              {filtersClear ? (
                <span className="text-foreground-subtle"> ({UI_PAGE_SIZE} por página)</span>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loadingMorePlayers}
                className="border-border bg-background-muted/50 text-foreground cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => void goPrevPage()}
              >
                Anterior
              </button>
              <span className="text-foreground-muted tabular-nums text-xs font-semibold">
                Pág. {page}
              </span>
              <button
                type="button"
                disabled={!canGoNext || loadingMorePlayers}
                className="border-border bg-background-muted/50 text-foreground cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => void goNextPage()}
              >
                {loadingMorePlayers ? "Cargando…" : "Siguiente"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {renderFilterPortal()}
    </>
  );
});

PlayersFilterableTable.displayName = "PlayersFilterableTable";
