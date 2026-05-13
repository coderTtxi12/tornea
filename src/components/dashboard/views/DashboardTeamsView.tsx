"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { MyLeaguesTeamRow } from "../leagues/my-leagues-state";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
  MockBadge,
} from "./dashboard-view-primitives";

function statusLabel(status: MyLeaguesTeamRow["status"]): string {
  if (status === "active") return "Activo";
  if (status === "inactive") return "Inactivo";
  return "Retirado";
}

function badgeCode(t: MyLeaguesTeamRow): string {
  if (t.shortName?.trim()) return t.shortName.trim().toUpperCase();
  return (
    t.name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 4) || "—"
  );
}

function categoryKey(t: MyLeaguesTeamRow): string {
  return t.categoryName ?? "—";
}

type FilterColumn = "league" | "category" | "status" | "code";

/** Mismo hover / padding que encabezados ordenables (teal + fondo suave). */
const tableHeaderBtnClass =
  "group inline-flex flex-nowrap items-center gap-[0.35rem] rounded-md border-0 bg-transparent py-[0.15rem] px-[0.2rem] text-left text-[11px] font-bold tracking-wide uppercase text-foreground-muted transition-[color,background-color] duration-100 ease-out hover:bg-brand-teal/[0.08] hover:text-brand-teal";

/** ↑↓ como `.thSortDir` + `.thSortDirIdle` / `.thSortDirActive` (idle #d1d5db). */
function SortDirGlyphs({
  activeColumn,
  dir,
  column,
}: {
  activeColumn: "name" | "players";
  dir: "asc" | "desc";
  column: "name" | "players";
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

export function DashboardTeamsView({
  teamRows,
  onOpenRegisterTeamDrawer,
  onOpenEditTeamDrawer,
}: {
  teamRows: readonly MyLeaguesTeamRow[];
  onOpenRegisterTeamDrawer: () => void;
  onOpenEditTeamDrawer: (args: { leagueId: string; teamId: string }) => void;
}) {
  const [sort, setSort] = useState<{ key: "name" | "players"; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc",
  });
  const [filterLeague, setFilterLeague] = useState<Set<string>>(() => new Set());
  const [filterCategory, setFilterCategory] = useState<Set<string>>(() => new Set());
  const [filterStatus, setFilterStatus] = useState<Set<string>>(() => new Set());
  const [filterCode, setFilterCode] = useState<Set<string>>(() => new Set());
  const [openFilter, setOpenFilter] = useState<FilterColumn | null>(null);
  const [filterAnchorRect, setFilterAnchorRect] = useState<DOMRect | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);

  const filterPanelRef = useRef<HTMLDivElement>(null);

  const closeFilter = useCallback(() => {
    setOpenFilter(null);
    setFilterAnchorRect(null);
  }, []);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    if (!openFilter) return;
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      const panel = filterPanelRef.current;
      if (panel?.contains(t)) return;
      if ((e.target as Element | null)?.closest?.("[data-team-filter-trigger]")) return;
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
    const categories = new Set<string>();
    const statuses = new Set<string>();
    const codes = new Set<string>();
    for (const t of teamRows) {
      leagues.add(t.leagueName);
      categories.add(categoryKey(t));
      statuses.add(statusLabel(t.status));
      codes.add(badgeCode(t));
    }
    return {
      leagues: [...leagues].sort((a, b) => a.localeCompare(b, "es")),
      categories: [...categories].sort((a, b) => a.localeCompare(b, "es")),
      statuses: [...statuses].sort((a, b) => a.localeCompare(b, "es")),
      codes: [...codes].sort((a, b) => a.localeCompare(b, "es")),
    };
  }, [teamRows]);

  const filteredSortedRows = useMemo(() => {
    let list = [...teamRows];

    if (filterLeague.size > 0) {
      list = list.filter((t) => filterLeague.has(t.leagueName));
    }
    if (filterCategory.size > 0) {
      list = list.filter((t) => filterCategory.has(categoryKey(t)));
    }
    if (filterStatus.size > 0) {
      list = list.filter((t) => filterStatus.has(statusLabel(t.status)));
    }
    if (filterCode.size > 0) {
      list = list.filter((t) => filterCode.has(badgeCode(t)));
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sort.key === "name") {
        cmp = a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      } else {
        cmp = a.playersCount - b.playersCount;
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [
    teamRows,
    sort,
    filterLeague,
    filterCategory,
    filterStatus,
    filterCode,
  ]);

  function toggleSortColumn(column: "name" | "players") {
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
      col === "league"
        ? optionSets.leagues
        : col === "category"
          ? optionSets.categories
          : col === "status"
            ? optionSets.statuses
            : optionSets.codes;
    const selected =
      col === "league"
        ? filterLeague
        : col === "category"
          ? filterCategory
          : col === "status"
            ? filterStatus
            : filterCode;
    const setSelected =
      col === "league"
        ? setFilterLeague
        : col === "category"
          ? setFilterCategory
          : col === "status"
            ? setFilterStatus
            : setFilterCode;

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
            Selecciona una o varias. El equipo debe coincidir con{" "}
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
              Sin selección = se muestran todos los equipos
            </span>
          )}
        </div>
      </div>,
      document.body,
    );
  }

  function headerFilterColumn(col: FilterColumn, label: string, selected: Set<string>) {
    const colWord =
      col === "league" ? "liga" : col === "category" ? "categoría" : col === "status" ? "estado" : "código";
    return (
      <button
        type="button"
        data-team-filter-trigger
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

  return (
    <>
      <DashboardViewHeader
        title="Equipos"
        hint="Todos los clubes de tus ligas. Datos desde `teams` y categoría / plantilla por temporada en `season_teams`."
        actions={
          <>
            <MockActionButton variant="secondary">Importar CSV</MockActionButton>
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
        <div className={`${floatCard} overflow-x-auto`}>
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead>
              <tr className="text-foreground-muted border-border border-b text-[11px] font-bold tracking-wide uppercase">
                <th className="px-4 py-3">
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
                        ? `Ordenar equipo ${sort.dir === "asc" ? "ascendente" : "descendente"}`
                        : "Ordenar por nombre de equipo"
                    }
                    onClick={() => toggleSortColumn("name")}
                  >
                    <span>Equipo</span>
                    <SortDirGlyphs activeColumn={sort.key} dir={sort.dir} column="name" />
                  </button>
                </th>
                <th className="px-4 py-3">{headerFilterColumn("league", "Liga", filterLeague)}</th>
                <th className="px-4 py-3">{headerFilterColumn("category", "Categoría", filterCategory)}</th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    className={`${tableHeaderBtnClass} whitespace-nowrap`}
                    title={
                      sort.key === "players"
                        ? sort.dir === "asc"
                          ? "Menos jugadores primero"
                          : "Más jugadores primero"
                        : "Ordenar por cantidad de jugadores"
                    }
                    aria-label={
                      sort.key === "players"
                        ? `Ordenar jugadores ${sort.dir === "asc" ? "ascendente" : "descendente"}`
                        : "Ordenar por cantidad de jugadores"
                    }
                    onClick={() => toggleSortColumn("players")}
                  >
                    <span>Jugadores</span>
                    <SortDirGlyphs activeColumn={sort.key} dir={sort.dir} column="players" />
                  </button>
                </th>
                <th className="px-4 py-3">{headerFilterColumn("status", "Estado", filterStatus)}</th>
                <th className="px-4 py-3">{headerFilterColumn("code", "Código", filterCode)}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {filteredSortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-foreground-muted px-4 py-6 text-center text-sm"
                  >
                    Ningún equipo coincide con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredSortedRows.map((t) => (
                  <tr
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    className="hover:bg-surface-code/20 cursor-pointer transition-colors"
                    onClick={() => onOpenEditTeamDrawer({ leagueId: t.leagueId, teamId: t.id })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenEditTeamDrawer({ leagueId: t.leagueId, teamId: t.id });
                      }
                    }}
                  >
                    <td className="px-4 py-2.5 font-medium">{t.name}</td>
                    <td className="text-foreground-muted px-4 py-2.5">{t.leagueName}</td>
                    <td className="text-foreground-muted px-4 py-2.5">
                      {t.categoryName ?? "—"}
                    </td>
                    <td className="text-foreground-muted px-4 py-2.5 tabular-nums">
                      {t.playersCount}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          t.status === "active"
                            ? "border-border bg-surface-code/50 rounded-md border px-2 py-0.5 text-xs font-semibold"
                            : "border-border text-foreground-muted rounded-md border border-dashed px-2 py-0.5 text-xs font-semibold"
                        }
                      >
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <MockBadge tone={t.status === "active" ? "lime" : "muted"}>
                        {badgeCode(t)}
                      </MockBadge>
                    </td>
                    <td
                      className="px-4 py-2.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <MockActionButton variant="ghost" className="!p-0 !text-xs">
                        Plantilla y fichas
                      </MockActionButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {renderFilterPortal()}
    </>
  );
}
