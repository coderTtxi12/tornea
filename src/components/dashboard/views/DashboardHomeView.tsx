"use client";

import { useMemo } from "react";

import {
  MOCK_LEAGUES,
  MOCK_RECENT_RESULTS,
  MOCK_STANDINGS_TABLE,
} from "../dashboard-mock-data";
import {
  floatCard,
  MockActionButton,
} from "./dashboard-view-primitives";

function IconPlay({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14.72L19 12.5 8 5.14Z" />
    </svg>
  );
}

export function DashboardHomeView() {
  const featured = MOCK_LEAGUES[0];
  const sideCards = MOCK_LEAGUES.slice(1, 3);

  const totals = useMemo(() => {
    return MOCK_LEAGUES.reduce(
      (acc, l) => {
        acc.played += l.stats.matchesPlayed;
        acc.scheduled += l.stats.matchesScheduled;
        return acc;
      },
      { played: 0, scheduled: 0 },
    );
  }, []);

  const standingsPreview = MOCK_STANDINGS_TABLE.slice(0, 4);

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div className={`${floatCard} relative overflow-hidden p-6 sm:p-8 lg:col-span-7`}>
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="flex flex-1 flex-col justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-blue/90 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                  {featured?.sportLabel}
                </span>
                <span className="rounded-full bg-brand-lime/90 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-navy uppercase">
                  Destacado
                </span>
                <span className="text-brand-teal flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className="bg-brand-lime size-1.5 rounded-full motion-safe:animate-pulse" />
                  En vivo
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-[1.75rem] xl:text-3xl">
                  {featured?.name ?? "Tu competencia"}
                </h2>
                <p className="text-foreground-muted mt-2 max-w-md text-sm leading-relaxed">
                  {featured?.nextMatch
                    ? `${featured.nextMatch.homeTeam} vs ${featured.nextMatch.awayTeam} · ${featured.nextMatch.kickoffLabel} · ${featured.nextMatch.venueShort}`
                    : "Arma fixture, rivales y estadísticas con energía Tornea."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <MockActionButton variant="primary">Ir al partido</MockActionButton>
                <MockActionButton variant="secondary" className="flex size-12 !p-0 items-center justify-center rounded-full">
                  <IconPlay className="ml-0.5 size-5 text-brand-blue" />
                </MockActionButton>
              </div>
            </div>
            <div className="border-border relative flex aspect-[4/3] w-full shrink-0 items-center justify-center rounded-brand-lg border bg-surface-code sm:aspect-auto sm:h-48 sm:w-48 lg:h-full lg:min-h-[12rem] lg:w-56">
              <span className="relative text-7xl sm:text-8xl">⚽</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5">
          {sideCards.map((l) => (
            <div
              key={l.id}
              className={`${floatCard} flex flex-1 flex-col justify-between p-5`}
            >
              <div>
                <p className="text-brand-teal text-[10px] font-bold tracking-widest uppercase">
                  {l.sportLabel}
                </p>
                <p className="mt-1 font-bold leading-snug">{l.name}</p>
                <p className="text-foreground-muted text-xs">{l.seasonLabel}</p>
              </div>
              <MockActionButton variant="secondary" className="mt-4 w-full py-2 text-xs">
                Entrar
              </MockActionButton>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-2">
          <h3 className="text-lg font-bold tracking-tight">Jornada y competencias</h3>
          <span className="text-foreground-muted text-xs tabular-nums">
            {totals.played}+{totals.scheduled} partidos · mock
          </span>
        </div>
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MOCK_LEAGUES.map((l) => {
            const total = l.stats.matchesPlayed + l.stats.matchesScheduled;
            const pct = total ? Math.round((l.stats.matchesPlayed / total) * 100) : 0;
            return (
              <div
                key={l.id}
                className={`${floatCard} w-[min(100%,16rem)] shrink-0 p-4`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-bold leading-snug">{l.name}</p>
                  <span className="text-lg opacity-80">⚽</span>
                </div>
                <p className="text-foreground-subtle text-[11px]">{l.seasonLabel}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-background-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-lime to-brand-teal transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-foreground-subtle mt-2 text-[11px]">
                  {l.stats.matchesScheduled > 0
                    ? `Cierra en ${l.stats.matchesScheduled} fechas · mock`
                    : "Fixture completo · mock"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className={`${floatCard} p-5 lg:col-span-5`}>
          <h3 className="text-foreground-muted text-xs font-bold tracking-wide uppercase">
            Leaderboard
          </h3>
          <ul className="mt-3 space-y-2">
            {standingsPreview.map((row) => (
              <li
                key={row.place}
                className="border-border/80 flex items-center gap-3 rounded-brand-md border bg-surface-code/30 px-3 py-2"
              >
                <span className="text-brand-lime w-6 text-center text-sm font-black tabular-nums">
                  {row.place}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.team}</span>
                <span className="text-foreground-muted text-xs tabular-nums">{row.pts} pts</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${floatCard} lg:col-span-7`}>
          <h3 className="text-foreground-muted px-5 pt-5 text-xs font-bold tracking-wide uppercase">
            Resultados recientes
          </h3>
          <ul className="divide-border mt-2 divide-y">
            {MOCK_RECENT_RESULTS.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="text-2xl opacity-90">⚽</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{row.title}</p>
                  <p className="text-foreground-muted text-xs">Marcador {row.score}</p>
                  {row.crewLabels?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {row.crewLabels.map((lbl) => (
                        <span
                          key={`${row.id}-${lbl}`}
                          className="border-border bg-surface-code/50 text-foreground-subtle rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                        >
                          {lbl}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 sm:text-right">
                  {row.badge === "final" ? (
                    <span className="inline-block rounded-full bg-brand-lime px-3 py-1 text-xs font-bold text-brand-navy">
                      Ganador
                    </span>
                  ) : row.badge === "draw" ? (
                    <span className="bg-surface-code text-foreground-muted inline-block rounded-full px-3 py-1 text-xs font-semibold">
                      Empate
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-brand-blue/25 px-3 py-1 text-xs font-semibold text-brand-teal">
                      Próximo
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
