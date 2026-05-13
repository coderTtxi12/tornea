"use client";

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
    setBroken(false);
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

type SortState = { key: "name" | "shirt"; dir: "asc" | "desc" };

const DEFAULT_SORT: SortState = { key: "name", dir: "asc" };

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
  activeColumn: "name" | "shirt";
  dir: "asc" | "desc";
  column: "name" | "shirt";
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

export type PlayersFilterableTableHandle = {
  clearAllFilters: () => void;
};

export type PlayersFilterableTableProps = {
  playerRows: readonly MyLeaguesPlayerRow[];
  /** Clic en la fila (como equipos): abre edición del jugador. */
  onEditPlayer: (args: { leagueId: string; teamId: string; playerId: string }) => void;
  wrapperClassName?: string;
  onHasActiveFiltersChange?: (active: boolean) => void;
};

export const PlayersFilterableTable = forwardRef<
  PlayersFilterableTableHandle,
  PlayersFilterableTableProps
>(function PlayersFilterableTable(
  { playerRows, onEditPlayer, wrapperClassName, onHasActiveFiltersChange },
  ref,
) {
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
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
      let cmp = 0;
      if (sort.key === "name") {
        cmp = a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base" });
      } else {
        cmp = cmpShirt(a.shirtNumber, b.shirtNumber, sort.dir);
      }
      return sort.key === "name" ? (sort.dir === "asc" ? cmp : -cmp) : cmp;
    });

    return list;
  }, [playerRows, sort, filterLeague, filterClub, filterPosition]);

  function toggleSortColumn(column: "name" | "shirt") {
    setSort((s) => {
      if (s.key === column) return { key: column, dir: s.dir === "asc" ? "desc" : "asc" };
      return { key: column, dir: "asc" };
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
        <table className="w-full min-w-[44rem] text-left text-sm">
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
              <th className="px-4 py-3 align-top" />
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {filteredSortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-foreground-muted px-4 py-6 text-center text-sm"
                >
                  Ningún jugador coincide con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredSortedRows.map((p) => (
                <tr
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  className="hover:bg-surface-code/20 cursor-pointer transition-colors"
                  onClick={() =>
                    onEditPlayer({
                      leagueId: p.leagueId,
                      teamId: p.teamId,
                      playerId: p.playerId,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onEditPlayer({
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
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      className="text-foreground-muted hover:text-foreground border border-transparent px-2 py-1 text-xs font-semibold underline-offset-4 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPlayer({
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
      </div>
      {renderFilterPortal()}
    </>
  );
});

PlayersFilterableTable.displayName = "PlayersFilterableTable";
