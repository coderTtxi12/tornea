"use client";

/**
 * Tabla de fixture / partidos — filtros y orden disparan consultas paginadas al API.
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

import type { MyLeaguesMatchRow } from "@/components/dashboard/leagues/my-leagues-state";
import { floatCard } from "@/components/dashboard/views/dashboard-view-primitives";

export const MATCHES_FILTERABLE_TABLE_TRIGGER_ATTR = "data-matches-filterable-trigger";

function statusLabelMx(s: string): string {
  const map: Record<string, string> = {
    scheduled: "Programado",
    live: "En vivo",
    finished: "Final",
    postponed: "Aplazado",
    cancelled: "Cancelado",
    walkover: "Walkover",
  };
  return map[s] ?? s;
}

/** Texto mostrado en la columna Fase (`matchday` + `round_label`). */
function formatPhaseDisplay(m: MyLeaguesMatchRow): string {
  const parts: string[] = [];
  if (m.matchday != null) parts.push(`J${m.matchday}`);
  if (m.roundLabel?.trim()) parts.push(m.roundLabel.trim());
  if (parts.length) return parts.join(" · ");
  return "—";
}

type PhaseHighlight = "none" | "semifinal" | "final" | "tercer";

function phaseHighlight(display: string): PhaseHighlight {
  if (display === "—") return "none";
  const t = display
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (/\bsemi[\s-]?final\b|\bsemifinal\b/.test(t)) {
    return "semifinal";
  }
  if (/\btercer[\s-]lugar\b|\b3(er|°|º)?[\s-]?lugar\b|tercer[\s-]puesto/.test(t)) {
    return "tercer";
  }
  if (/(cuartos|octavos|dieciseisavos|diecisieisavos)\s+de\s+final/.test(t)) {
    return "none";
  }
  if (/\bfinal\b/.test(t)) {
    return "final";
  }
  return "none";
}

function PhaseBadge({ m }: { m: MyLeaguesMatchRow }) {
  const text = formatPhaseDisplay(m);
  const h = phaseHighlight(text);
  const styles: Record<PhaseHighlight, string> = {
    none: "border-border bg-surface-code/50 text-foreground-muted border",
    semifinal:
      "border-amber-400/45 bg-amber-500/18 text-amber-50 border shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)]",
    final: "border-brand-blue/50 bg-brand-blue/25 text-brand-teal border",
    tercer:
      "border-orange-500/45 bg-orange-600/20 text-orange-50 border shadow-[inset_0_0_0_1px_rgba(249,115,22,0.12)]",
  };
  return (
    <span
      className={`inline-block max-w-[13rem] truncate rounded-md border px-2 py-0.5 text-xs font-semibold ${styles[h]}`}
      title={text === "—" ? undefined : text}
    >
      {text}
    </span>
  );
}

function formatKickoff(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timeZone?.trim() || undefined,
    });
  } catch {
    return d.toLocaleString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

function cmpKickoff(isoA: string, isoB: string, dir: "asc" | "desc"): number {
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

function matchupSortKey(m: MyLeaguesMatchRow): string {
  return `${m.homeTeamName} ${m.awayTeamName}`.toLocaleLowerCase("es");
}

type FilterColumn = "league" | "season" | "status" | "category";

type SortKey = "kickoff" | "matchup";

export type MatchesTableSortState = { key: SortKey; dir: "asc" | "desc" };

/** Orden inicial: fecha ascendente = partido más próximo arriba. */
export const MATCHES_TABLE_DEFAULT_SORT: MatchesTableSortState = {
  key: "kickoff",
  dir: "asc",
};

function isDefaultSort(s: MatchesTableSortState): boolean {
  return s.key === MATCHES_TABLE_DEFAULT_SORT.key && s.dir === MATCHES_TABLE_DEFAULT_SORT.dir;
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
  selected: readonly string[],
  columnLabel: string,
  chipLabel: (value: string) => string,
  onRemove: (value: string) => void,
) {
  if (selected.length === 0) return null;
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
          <span className="min-w-0 truncate" title={chipLabel(tag)}>
            {chipLabel(tag)}
          </span>
          <button
            type="button"
            className="text-foreground-muted hover:text-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-0.5 text-[11px] font-semibold leading-none tracking-tight transition-colors hover:bg-brand-teal/20"
            aria-label={`Quitar filtro ${columnLabel}: ${chipLabel(tag)}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(tag);
            }}
          >
            X
          </button>
        </span>
      ))}
    </div>
  );
}

function statusBadgeTone(
  status: string,
): "muted" | "lime" | "blue" | "warn" {
  if (status === "live") return "lime";
  if (status === "finished" || status === "walkover") return "blue";
  if (status === "postponed" || status === "cancelled") return "warn";
  return "muted";
}

function StatusBadge({ status }: { status: string }) {
  const label = statusLabelMx(status);
  const tone = statusBadgeTone(status);
  const tones: Record<typeof tone, string> = {
    muted: "bg-surface-code text-foreground-muted border-border border",
    lime: "bg-brand-lime text-brand-navy",
    blue: "bg-brand-blue/20 text-brand-teal border border-brand-blue/30",
    warn: "bg-brand-purple/20 text-foreground border border-brand-purple/35",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

export type MatchesFilterableTableHandle = {
  clearAllFilters: () => void;
};

export type MatchesFilterableTableProps = {
  /** Dataset completo; filtros, orden y paginación solo en cliente. */
  matchRows: readonly MyLeaguesMatchRow[];
  wrapperClassName?: string;
  onHasActiveFiltersChange?: (active: boolean) => void;
  onEditMatch: (row: MyLeaguesMatchRow) => void;
};

const UI_PAGE_SIZE = 20;

export const MatchesFilterableTable = forwardRef<
  MatchesFilterableTableHandle,
  MatchesFilterableTableProps
>(function MatchesFilterableTable(
  { matchRows: allMatchRows, wrapperClassName, onHasActiveFiltersChange, onEditMatch },
  ref,
) {
  const [sort, setSort] = useState<MatchesTableSortState>(MATCHES_TABLE_DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [filterLeague, setFilterLeague] = useState<Set<string>>(() => new Set());
  const [filterSeason, setFilterSeason] = useState<Set<string>>(() => new Set());
  const [filterStatus, setFilterStatus] = useState<Set<string>>(() => new Set());
  const [filterCategory, setFilterCategory] = useState<Set<string>>(() => new Set());
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

  const categoryLabel = useCallback((m: MyLeaguesMatchRow) => {
    const n = m.categoryName?.trim();
    return n && n.length > 0 ? n : "Sin categoría";
  }, []);

  const optionSets = useMemo(() => {
    const leagues = new Set<string>();
    const seasons = new Set<string>();
    const statuses = new Set<string>();
    const categories = new Set<string>();
    for (const m of allMatchRows) {
      leagues.add(m.leagueName);
      seasons.add(m.seasonName);
      statuses.add(m.status);
      categories.add(categoryLabel(m));
    }
    return {
      leagues: [...leagues].sort((a, b) => a.localeCompare(b, "es")),
      seasons: [...seasons].sort((a, b) => a.localeCompare(b, "es")),
      statuses: [...statuses].sort((a, b) => a.localeCompare(b)),
      categories: [...categories].sort((a, b) => a.localeCompare(b, "es")),
    };
  }, [allMatchRows, categoryLabel]);

  const filteredSortedRows = useMemo(() => {
    let list = [...allMatchRows];

    if (filterLeague.size > 0) {
      list = list.filter((m) => filterLeague.has(m.leagueName));
    }
    if (filterSeason.size > 0) {
      list = list.filter((m) => filterSeason.has(m.seasonName));
    }
    if (filterStatus.size > 0) {
      list = list.filter((m) => filterStatus.has(m.status));
    }
    if (filterCategory.size > 0) {
      list = list.filter((m) => filterCategory.has(categoryLabel(m)));
    }

    list.sort((a, b) => {
      if (sort.key === "kickoff") {
        return cmpKickoff(a.scheduledAt, b.scheduledAt, sort.dir);
      }
      const cmp = matchupSortKey(a).localeCompare(matchupSortKey(b), "es");
      return sort.dir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [allMatchRows, sort, filterLeague, filterSeason, filterStatus, filterCategory, categoryLabel]);

  const totalFiltered = filteredSortedRows.length;
  const maxPage = Math.max(1, Math.ceil(totalFiltered / UI_PAGE_SIZE));
  const effectivePage = Math.min(Math.max(1, page), maxPage);
  const pageStart = (effectivePage - 1) * UI_PAGE_SIZE;
  const visibleRows = filteredSortedRows.slice(pageStart, pageStart + UI_PAGE_SIZE);

  const hasActiveColumnFilters =
    filterLeague.size + filterSeason.size + filterStatus.size + filterCategory.size > 0;
  const sortDiffersFromDefault = !isDefaultSort(sort);
  const pageAwayFromFirst = effectivePage > 1;
  const canClearTableState = hasActiveColumnFilters || sortDiffersFromDefault || pageAwayFromFirst;

  useEffect(() => {
    onHasActiveFiltersChange?.(canClearTableState);
  }, [canClearTableState, onHasActiveFiltersChange]);

  useImperativeHandle(
    ref,
    () => ({
      clearAllFilters: () => {
        setFilterLeague(new Set());
        setFilterSeason(new Set());
        setFilterStatus(new Set());
        setFilterCategory(new Set());
        setSort(MATCHES_TABLE_DEFAULT_SORT);
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
      if ((e.target as Element | null)?.closest?.(`[${MATCHES_FILTERABLE_TABLE_TRIGGER_ATTR}]`))
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

  const canGoNext = effectivePage < maxPage;

  const goPrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goNextPage = useCallback(() => {
    setPage((p) => {
      const mp = Math.max(1, Math.ceil(totalFiltered / UI_PAGE_SIZE));
      return Math.min(p + 1, mp);
    });
  }, [totalFiltered]);

  function toggleSortColumn(column: SortKey) {
    setPage(1);
    const dirDefaults: Record<SortKey, "asc" | "desc"> = {
      kickoff: "asc",
      matchup: "asc",
    };
    setSort((s) => {
      if (s.key === column) return { key: column, dir: s.dir === "asc" ? "desc" : "asc" };
      return { key: column, dir: dirDefaults[column] };
    });
  }

  function toggleFilterValue(column: FilterColumn, value: string) {
    setPage(1);
    const patch = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });
    };
    if (column === "league") patch(setFilterLeague);
    else if (column === "season") patch(setFilterSeason);
    else if (column === "status") patch(setFilterStatus);
    else patch(setFilterCategory);
  }

  function clearColumnFilter(column: FilterColumn) {
    setPage(1);
    if (column === "league") setFilterLeague(new Set());
    else if (column === "season") setFilterSeason(new Set());
    else if (column === "status") setFilterStatus(new Set());
    else setFilterCategory(new Set());
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
      col === "league"
        ? optionSets.leagues
        : col === "season"
          ? optionSets.seasons
          : col === "status"
            ? optionSets.statuses
            : optionSets.categories;
    const selectedArr =
      col === "league"
        ? [...filterLeague].sort((a, b) => a.localeCompare(b, "es"))
        : col === "season"
          ? [...filterSeason].sort((a, b) => a.localeCompare(b, "es"))
          : col === "status"
            ? [...filterStatus].sort((a, b) => a.localeCompare(b))
            : [...filterCategory].sort((a, b) => a.localeCompare(b, "es"));

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
            Selecciona una o varias. El partido debe coincidir con{" "}
            <span className="text-foreground font-medium">al menos una</span> de las etiquetas de esta
            columna.
          </p>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
              const on = selectedArr.includes(opt);
              const label = col === "status" ? statusLabelMx(opt) : opt;
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
                  onClick={() => toggleFilterValue(col, opt)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-border flex items-center justify-between gap-2 border-t px-3 py-2">
          {selectedArr.length > 0 ? (
            <>
              <span className="text-foreground-subtle text-[11px]">
                {selectedArr.length === 1
                  ? "1 etiqueta activa"
                  : `${selectedArr.length} etiquetas activas`}
              </span>
              <button
                type="button"
                className="text-foreground-muted hover:text-foreground text-xs font-medium underline-offset-4 hover:underline"
                onClick={() => clearColumnFilter(col)}
              >
                Limpiar filtros
              </button>
            </>
          ) : (
            <span className="text-foreground-subtle text-[11px]">
              Sin selección = se muestran todos los partidos
            </span>
          )}
        </div>
      </div>,
      document.body,
    );
  }

  function headerFilterColumn(col: FilterColumn, label: string, selected: Set<string>) {
    const colWord =
      col === "league"
        ? "liga"
        : col === "season"
          ? "temporada"
          : col === "status"
            ? "estado"
            : "categoría";
    const n = selected.size;
    return (
      <button
        type="button"
        {...{ [MATCHES_FILTERABLE_TABLE_TRIGGER_ATTR]: "" }}
        className={`${tableHeaderBtnClass} whitespace-nowrap`}
        aria-label={
          n > 0 ? `Filtrar por ${colWord}, ${n} etiquetas activas` : `Filtrar por ${colWord}`
        }
        aria-expanded={openFilter === col}
        aria-haspopup="dialog"
        title={
          n > 0
            ? `${label}: ${n} filtro${n === 1 ? "" : "s"} activo${n === 1 ? "" : "s"}`
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
        <IconFilter active={n > 0} />
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
                <span className={tableHeaderBtnClass}>Fase</span>
              </th>
              <th className="px-4 py-3 align-top">
                <button
                  type="button"
                  className={`${tableHeaderBtnClass} whitespace-nowrap`}
                  title={
                    sort.key === "kickoff"
                      ? sort.dir === "asc"
                        ? "Más próximos primero (predeterminado)"
                        : "Más tardíos primero"
                      : "Ordenar por fecha y hora"
                  }
                  aria-label={
                    sort.key === "kickoff"
                      ? `Ordenar fecha ${sort.dir === "asc" ? "ascendente" : "descendente"}`
                      : "Ordenar por fecha y hora del partido"
                  }
                  onClick={() => toggleSortColumn("kickoff")}
                >
                  <span>Fecha</span>
                  <SortDirGlyphs activeColumn={sort.key} dir={sort.dir} column="kickoff" />
                </button>
              </th>
              <th className="px-4 py-3 align-top">
                <button
                  type="button"
                  className={`${tableHeaderBtnClass} min-w-0`}
                  title={
                    sort.key === "matchup"
                      ? sort.dir === "asc"
                        ? "Orden A → Z"
                        : "Orden Z → A"
                      : "Ordenar por equipos"
                  }
                  aria-label={
                    sort.key === "matchup"
                      ? `Ordenar partido ${sort.dir === "asc" ? "ascendente" : "descendente"}`
                      : "Ordenar por enfrentamiento"
                  }
                  onClick={() => toggleSortColumn("matchup")}
                >
                  <span>Partido</span>
                  <SortDirGlyphs activeColumn={sort.key} dir={sort.dir} column="matchup" />
                </button>
              </th>
              <th className="px-4 py-3 align-top">
                <span className={tableHeaderBtnClass}>Cancha</span>
              </th>
              <th className="max-w-[14rem] px-4 py-3 align-top whitespace-normal">
                {headerFilterColumn("league", "Liga", filterLeague)}
                {selectedTagsChips(
                  [...filterLeague].sort((a, b) => a.localeCompare(b, "es")),
                  "Liga",
                  (v) => v,
                  (v) => removeTagFromSet(setFilterLeague, v),
                )}
              </th>
              <th className="max-w-[12rem] px-4 py-3 align-top whitespace-normal">
                {headerFilterColumn("season", "Temp.", filterSeason)}
                {selectedTagsChips(
                  [...filterSeason].sort((a, b) => a.localeCompare(b, "es")),
                  "Temporada",
                  (v) => v,
                  (v) => removeTagFromSet(setFilterSeason, v),
                )}
              </th>
              <th className="max-w-[12rem] px-4 py-3 align-top whitespace-normal">
                {headerFilterColumn("category", "Cat.", filterCategory)}
                {selectedTagsChips(
                  [...filterCategory].sort((a, b) => a.localeCompare(b, "es")),
                  "Categoría",
                  (v) => v,
                  (v) => removeTagFromSet(setFilterCategory, v),
                )}
              </th>
              <th className="max-w-[10rem] px-4 py-3 align-top whitespace-normal">
                {headerFilterColumn("status", "Estado", filterStatus)}
                {selectedTagsChips(
                  [...filterStatus].sort((a, b) => a.localeCompare(b)),
                  "Estado",
                  (v) => statusLabelMx(v),
                  (v) => removeTagFromSet(setFilterStatus, v),
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {filteredSortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-foreground-muted px-4 py-6 text-center text-sm"
                >
                  Ningún partido coincide con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              visibleRows.map((m) => (
                <tr
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  className="hover:bg-surface-code/20 cursor-pointer transition-colors"
                  onClick={() => onEditMatch(m)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onEditMatch(m);
                    }
                  }}
                >
                  <td className="px-4 py-2.5 align-middle">
                    <PhaseBadge m={m} />
                  </td>
                  <td className="text-foreground-muted px-4 py-2.5 whitespace-nowrap tabular-nums">
                    {formatKickoff(m.scheduledAt, m.timezone)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">
                      {m.homeTeamName}{" "}
                      <span className="text-foreground-muted px-1 font-normal">vs</span>{" "}
                      {m.awayTeamName}
                    </span>
                  </td>
                  <td className="text-foreground-muted max-w-[11rem] truncate px-4 py-2.5 text-xs">
                    {m.venueName?.trim() ? m.venueName.trim() : "—"}
                  </td>
                  <td className="text-foreground-muted max-w-[12rem] truncate px-4 py-2.5 text-xs">
                    {m.leagueName}
                  </td>
                  <td className="text-foreground-muted max-w-[12rem] truncate px-4 py-2.5 text-xs">
                    {m.seasonName}
                  </td>
                  <td className="text-foreground-muted max-w-[10rem] truncate px-4 py-2.5 text-xs">
                    {categoryLabel(m)}
                  </td>
                  <td className="px-4 py-2.5 align-middle">
                    <StatusBadge status={m.status} />
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
              <span className="text-foreground font-semibold tabular-nums">{totalFiltered}</span>
              <span className="text-foreground-subtle"> ({UI_PAGE_SIZE} por página)</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={effectivePage <= 1}
                className="border-border bg-background-muted/50 text-foreground cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => void goPrevPage()}
              >
                Anterior
              </button>
              <span className="text-foreground-muted tabular-nums text-xs font-semibold">
                Pág. {effectivePage}
              </span>
              <button
                type="button"
                disabled={!canGoNext}
                className="border-border bg-background-muted/50 text-foreground cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => void goNextPage()}
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {renderFilterPortal()}
    </>
  );
});

MatchesFilterableTable.displayName = "MatchesFilterableTable";
