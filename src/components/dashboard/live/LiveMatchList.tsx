"use client";

import { Calendar, Radio } from "lucide-react";

import type { MyLeaguesMatchRow } from "@/components/dashboard/leagues/my-leagues-state";

import type { LiveMatchListItem } from "./match-operations-types";
import { MockBadge, floatCard } from "../views/dashboard-view-primitives";

const LIVE_STATUSES = new Set(["scheduled", "live"]);

/** En vivo primero; luego por `scheduledAt` del más próximo al más lejano. */
export function sortLiveMatchesByProximity(
  a: LiveMatchListItem,
  b: LiveMatchListItem,
  nowMs = Date.now(),
): number {
  if (a.status === "live" && b.status !== "live") return -1;
  if (b.status === "live" && a.status !== "live") return 1;

  const ta = Date.parse(a.scheduledAt);
  const tb = Date.parse(b.scheduledAt);
  const aFuture = ta >= nowMs;
  const bFuture = tb >= nowMs;

  if (aFuture && bFuture) return ta - tb;
  if (aFuture && !bFuture) return -1;
  if (!aFuture && bFuture) return 1;
  return tb - ta;
}

function formatMatchTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function matchesForLiveSection(rows: readonly MyLeaguesMatchRow[]): LiveMatchListItem[] {
  return rows
    .filter((m) => LIVE_STATUSES.has(m.status))
    .map((m) => ({
      id: m.id,
      leagueId: m.leagueId,
      leagueName: m.leagueName,
      categoryName: m.categoryName,
      homeTeamName: m.homeTeamName,
      awayTeamName: m.awayTeamName,
      venueName: m.venueName,
      status: m.status,
      scheduledAt: m.scheduledAt,
    }))
    .sort(sortLiveMatchesByProximity);
}

export function LiveMatchList({
  matches,
  selectedId,
  onSelect,
}: {
  matches: readonly LiveMatchListItem[];
  selectedId: string | null;
  onSelect: (m: LiveMatchListItem) => void;
}) {
  if (matches.length === 0) {
    return (
      <div className={`${floatCard} border-dashed p-6`}>
        <p className="text-foreground-muted text-sm leading-relaxed">
          No hay partidos programados o en vivo. Crea partidos desde Fixture.
        </p>
      </div>
    );
  }

  const liveCount = matches.filter((m) => m.status === "live").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-foreground-muted text-xs font-bold uppercase tracking-wider">
          Partidos
        </p>
        {liveCount > 0 ? (
          <span className="text-brand-lime flex items-center gap-1 text-[10px] font-bold uppercase">
            <Radio className="size-3" aria-hidden />
            {liveCount} en vivo
          </span>
        ) : null}
      </div>
      <ul className="space-y-2">
        {matches.map((m) => {
          const active = m.id === selectedId;
          const timeLabel = formatMatchTime(m.scheduledAt);
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onSelect(m)}
                className={`${floatCard} w-full cursor-pointer border-l-4 p-4 text-left transition-[border-color,box-shadow,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50 ${
                  active
                    ? "border-l-brand-lime bg-brand-teal/5 ring-1 ring-brand-lime/40"
                    : "border-l-transparent hover:border-l-brand-teal/50 hover:bg-surface-card/80"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  {m.status === "live" ? (
                    <MockBadge tone="lime">
                      <span className="mr-1 inline-block size-1.5 rounded-full bg-brand-navy motion-safe:animate-pulse" />
                      En vivo
                    </MockBadge>
                  ) : (
                    <MockBadge tone="muted">Programado</MockBadge>
                  )}
                  <span className="text-foreground-subtle truncate text-[10px] font-medium">
                    {m.leagueName}
                  </span>
                </div>
                <p className="text-sm font-semibold leading-snug">
                  <span className="text-foreground">{m.homeTeamName}</span>
                  <span className="text-foreground-muted mx-1.5 font-normal">vs</span>
                  <span className="text-foreground">{m.awayTeamName}</span>
                </p>
                <div className="text-foreground-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {m.venueName ? <span className="truncate">{m.venueName}</span> : null}
                  {timeLabel ? (
                    <span className="flex items-center gap-1 tabular-nums">
                      <Calendar className="text-brand-teal size-3 shrink-0" aria-hidden />
                      {timeLabel}
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
