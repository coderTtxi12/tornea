"use client";

import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formatMatchSchedule } from "./live-match-format";
import type { LiveMatchListItem } from "./match-operations-types";

function matchMetaLine(m: LiveMatchListItem): string {
  const timeLabel = formatMatchSchedule(m.scheduledAt);
  return [m.leagueName, timeLabel, m.venueName].filter(Boolean).join(" · ");
}

export function LiveMatchPickerStep({
  matches,
  selectedId,
  onSelect,
  onContinue,
}: {
  matches: readonly LiveMatchListItem[];
  selectedId: string | null;
  onSelect: (m: LiveMatchListItem) => void;
  onContinue: () => void;
}) {
  if (matches.length === 0) {
    return (
      <p className="text-foreground-muted rounded-brand-md border border-dashed border-border px-4 py-8 text-center text-sm">
        No hay partidos programados o en vivo. Créalos desde Fixture.
      </p>
    );
  }

  const selected = matches.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <ul className="grid gap-2 sm:grid-cols-2">
        {matches.map((m, index) => {
          const active = m.id === selectedId;
          const meta = matchMetaLine(m);
          const isNearest = index === 0;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onSelect(m)}
                className={cn(
                  "w-full cursor-pointer rounded-brand-md border px-4 py-3 text-left transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50",
                  active
                    ? "border-brand-lime/50 bg-brand-teal/5"
                    : "border-border bg-transparent hover:border-brand-teal/25 hover:bg-surface-card/50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-medium leading-snug">
                    {m.homeTeamName}
                    <span className="text-foreground-muted font-normal"> vs </span>
                    {m.awayTeamName}
                  </p>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    {isNearest ? (
                      <span className="text-brand-lime text-[10px] font-semibold uppercase tracking-wide">
                        {m.status === "live" ? "Ahora" : "Próximo"}
                      </span>
                    ) : null}
                    {m.categoryName ? (
                      <span className="text-brand-teal text-[11px] font-medium">{m.categoryName}</span>
                    ) : null}
                  </span>
                </div>
                {meta ? (
                  <p className="text-foreground-muted mt-1 truncate text-xs">{meta}</p>
                ) : null}
                {m.status === "live" ? (
                  <p className="text-brand-lime mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                    <span className="bg-brand-lime size-1.5 shrink-0 rounded-full motion-safe:animate-pulse" />
                    En vivo
                  </p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-foreground-muted min-w-0 truncate text-sm">
          {selected ? (
            <>
              {selected.categoryName ? (
                <span className="text-brand-teal">{selected.categoryName} · </span>
              ) : null}
              {selected.homeTeamName} vs {selected.awayTeamName}
            </>
          ) : (
            "Selecciona un partido"
          )}
        </p>
        <Button
          type="button"
          variant="default"
          className="cursor-pointer shrink-0"
          disabled={!selected}
          onClick={onContinue}
        >
          Continuar
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
