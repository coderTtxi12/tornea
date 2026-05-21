"use client";

import type { MyLeaguesTeamRow } from "@/components/dashboard/leagues/my-leagues-state";

import { ChevronDownIcon, CloseIcon, SearchIcon } from "./player-form-icons";
import { teamDisplayLabel } from "./player-form-utils";

export type PlayerFormTeamPickerProps = {
  teamRows: readonly MyLeaguesTeamRow[];
  teamId: string;
  teamSearch: string;
  teamListOpen: boolean;
  teamHighlight: number;
  filteredTeams: readonly MyLeaguesTeamRow[];
  selectedTeam: MyLeaguesTeamRow | null;
  fieldError?: string;
  disabled: boolean;
  lockSelection: boolean;
  comboWrapRef: React.RefObject<HTMLDivElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  onSearchFocus: () => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSelectTeam: (team: MyLeaguesTeamRow) => void;
  onClearSelection: () => void;
  onHighlightIndex: (index: number) => void;
};

export function PlayerFormTeamPicker({
  teamId,
  teamSearch,
  teamListOpen,
  teamHighlight,
  filteredTeams,
  selectedTeam,
  fieldError,
  disabled,
  lockSelection,
  comboWrapRef,
  searchInputRef,
  onSearchChange,
  onSearchFocus,
  onSearchKeyDown,
  onSelectTeam,
  onClearSelection,
  onHighlightIndex,
}: PlayerFormTeamPickerProps) {
  return (
    <div className="block">
      <label htmlFor="player-team-search" className="text-foreground-muted text-xs font-medium">
        Equipo
      </label>
      <div ref={comboWrapRef} className="relative mt-1">
        <span
          className="text-foreground-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          aria-hidden
        >
          <SearchIcon />
        </span>
        <input
          id="player-team-search"
          ref={searchInputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={teamListOpen}
          aria-controls="player-team-listbox"
          aria-activedescendant={
            teamListOpen && teamHighlight >= 0
              ? `player-team-option-${teamHighlight}`
              : undefined
          }
          value={teamSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onSearchFocus}
          onKeyDown={onSearchKeyDown}
          placeholder="Busca por equipo, liga o categoría…"
          required
          disabled={disabled}
          className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 w-full appearance-none rounded-brand-md border py-2.5 pr-9 pl-9 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
          aria-invalid={!!fieldError}
        />
        {teamId && !lockSelection ? (
          <button
            type="button"
            onClick={onClearSelection}
            disabled={disabled}
            aria-label="Limpiar selección de equipo"
            className="text-foreground-muted hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 disabled:opacity-40"
          >
            <CloseIcon />
          </button>
        ) : (
          <span
            className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
            aria-hidden
          >
            <ChevronDownIcon />
          </span>
        )}

        {teamListOpen && !lockSelection && !disabled ? (
          <ul
            id="player-team-listbox"
            role="listbox"
            className="border-border bg-background absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-brand-md border shadow-lg"
          >
            {filteredTeams.length === 0 ? (
              <li
                role="option"
                aria-disabled
                aria-selected={false}
                className="text-foreground-muted px-3 py-2.5 text-xs italic"
              >
                Sin coincidencias para &quot;{teamSearch.trim()}&quot;. Revisa el nombre del
                equipo, la liga o la categoría.
              </li>
            ) : (
              filteredTeams.map((t, idx) => {
                const isHighlight = idx === teamHighlight;
                const isSelected = t.id === teamId;
                return (
                  <li
                    key={t.id}
                    id={`player-team-option-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelectTeam(t);
                    }}
                    onMouseEnter={() => onHighlightIndex(idx)}
                    className={`cursor-pointer px-3 py-2 text-sm ${
                      isHighlight
                        ? "bg-surface-code/60 text-foreground"
                        : "text-foreground hover:bg-surface-code/40"
                    }`}
                  >
                    <div className="font-medium leading-tight">{t.name}</div>
                    <div className="text-foreground-muted text-[11px] leading-tight">
                      {t.leagueName}
                      {t.categoryName ? ` · ${t.categoryName}` : ""}
                      {t.shortName ? ` · ${t.shortName}` : ""}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>
      {selectedTeam ? (
        <p className="text-foreground-subtle mt-1 text-[11px]">
          Equipo seleccionado:{" "}
          <span className="text-foreground font-medium">
            {selectedTeam.name} · {selectedTeam.leagueName}
          </span>
        </p>
      ) : (
        <p className="text-foreground-subtle mt-1 text-[11px]">
          Escribe para filtrar. Usa ↑↓ y Enter para seleccionar.
        </p>
      )}
      {fieldError ? (
        <span className="text-brand-purple mt-1 block text-xs">{fieldError}</span>
      ) : null}
    </div>
  );
}
