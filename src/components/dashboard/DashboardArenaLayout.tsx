"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { MOCK_LEAGUES } from "./dashboard-mock-data";
import {
  DashboardNavPillMobile,
  DashboardNavSidebar,
  type DashboardNavKey,
} from "./nav";

export type DashboardArenaLayoutProps = {
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  avatarInitial: string;
  onSignOut: () => void;
  signingOut: boolean;
  authConfigured: boolean;
};

const MOCK_RESULTS = [
  {
    id: "r1",
    title: "El Bosque vs Unión San José",
    score: "2 — 1",
    badge: "final" as const,
  },
  {
    id: "r2",
    title: "Café Andino vs Logística Sur",
    score: "0 — 0",
    badge: "draw" as const,
  },
  {
    id: "r3",
    title: "Tornea FC vs Estrella del Río",
    score: "—",
    badge: "upcoming" as const,
  },
];

const MOCK_STANDINGS = [
  { place: 1, team: "Atlético El Bosque", pts: 32 },
  { place: 2, team: "Unión San José", pts: 29 },
  { place: 3, team: "Deportivo 12 de Octubre", pts: 24 },
  { place: 4, team: "Estrella del Río", pts: 18 },
];

const MOCK_CHAT = [
  { who: "Delegado", msg: "¿Parte médico para el 10?", t: "18:02" },
  { who: "Vos", msg: "Arbitraje listo.", t: "18:04" },
  { who: "TV", msg: "Gradería llena.", t: "18:12" },
];

const floatCard =
  "rounded-brand-xl border border-border bg-[color-mix(in_srgb,var(--surface-card)_72%,transparent)] shadow-[var(--card-shadow)] backdrop-blur-xl transition-[transform,box-shadow] duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_28px_60px_-24px_color-mix(in_srgb,var(--tornea-blue)_40%,transparent)] motion-reduce:transform-none";

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a7.723 7.723 0 0 1 0 .255c-.008.379.137.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a7.723 7.723 0 0 1 0-.255c.007-.38-.138-.751-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14.72L19 12.5 8 5.14Z" />
    </svg>
  );
}

export function DashboardArenaLayout({
  displayName,
  email,
  avatarUrl,
  avatarInitial,
  onSignOut,
  signingOut,
  authConfigured,
}: DashboardArenaLayoutProps) {
  const [nav, setNav] = useState<DashboardNavKey>("home");

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

  return (
    <div
      className="bg-background text-foreground flex min-h-dvh w-full antialiased"
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <DashboardNavSidebar active={nav} onNavigate={setNav} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <header
          className="border-border flex h-14 shrink-0 items-center gap-3 border-b bg-background px-3 sm:px-5"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="border-border bg-surface-code/60 text-foreground-subtle relative hidden min-w-0 max-w-xl flex-1 items-center rounded-full border py-2 pr-3 pl-10 text-sm sm:flex">
            <IconSearch className="text-foreground-muted absolute left-3.5 size-4" />
            <input
              type="search"
              readOnly
              placeholder="Buscar club, torneo, jugador…"
              className="placeholder:text-foreground-muted w-full bg-transparent outline-none"
              aria-label="Búsqueda (mock)"
            />
            <kbd className="border-border text-foreground-subtle ml-2 hidden shrink-0 rounded-md border bg-background px-1.5 font-mono text-[10px] lg:inline">
              ⌘K
            </kbd>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled
              className="border-border bg-surface-code text-foreground-muted hover:border-brand-teal/40 relative flex size-9 items-center justify-center rounded-full border transition-colors sm:size-10"
              aria-label="Alertas"
            >
              <IconBell className="size-[1.1rem]" />
              <span className="bg-brand-lime absolute top-1 right-1 size-2 rounded-full ring-2 ring-background motion-safe:animate-pulse" />
            </button>
            <button
              type="button"
              disabled
              className="border-border bg-surface-code text-foreground-muted flex size-9 items-center justify-center rounded-full border hover:border-brand-teal/40 sm:size-10"
              aria-label="Ajustes rápidos"
            >
              <IconSettings className="size-[1.1rem]" />
            </button>
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={36}
                height={36}
                className="border-border size-9 rounded-full border-2 object-cover sm:size-10"
              />
            ) : (
              <div className="border-border from-brand-lime/40 text-brand-navy flex size-9 items-center justify-center rounded-full border-2 bg-gradient-to-br to-brand-teal/50 text-xs font-bold sm:size-10">
                {avatarInitial}
              </div>
            )}
          </div>
        </header>

        <DashboardNavPillMobile active={nav} onNavigate={setNav} />

        <div className="flex min-h-0 flex-1">
          <main className="to-background-muted/25 min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-background px-3 py-5 sm:px-5 lg:px-6 lg:py-8">
            <div className="mx-auto max-w-5xl xl:max-w-none xl:pr-2 2xl:max-w-[calc(100vw-22rem)]">
              <p className="text-foreground-muted text-xs font-medium tracking-wide uppercase">
                Organiza · Compite · Conecta · Hola, {displayName.split(" ")[0] ?? displayName}
              </p>

              {/* Hero + secundarias */}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
                <div className={`${floatCard} relative overflow-hidden p-6 sm:p-8 lg:col-span-7`}>
                  <div
                    className="pointer-events-none absolute -right-20 -bottom-16 size-72 rounded-full opacity-40 blur-3xl"
                    style={{
                      background:
                        "radial-gradient(circle, color-mix(in srgb, var(--tornea-lime) 45%, transparent), transparent 70%)",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute -top-24 -left-20 size-64 rounded-full opacity-35 blur-3xl"
                    style={{
                      background:
                        "radial-gradient(circle, color-mix(in srgb, var(--tornea-blue) 40%, transparent), transparent 70%)",
                    }}
                  />
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
                          En vivo · mock
                        </span>
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-[1.75rem] xl:text-3xl">
                          {featured?.name ?? "Tu competencia"}
                        </h1>
                        <p className="text-foreground-muted mt-2 max-w-md text-sm leading-relaxed">
                          {featured?.nextMatch
                            ? `${featured.nextMatch.homeTeam} vs ${featured.nextMatch.awayTeam} · ${featured.nextMatch.kickoffLabel} · ${featured.nextMatch.venueShort}`
                            : "Armá fixture, rivales y estadísticas con energía Tornea."}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          disabled
                          className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[color-mix(in_srgb,var(--tornea-blue)_35%,transparent)]"
                        >
                          Ir al partido
                        </button>
                        <button
                          type="button"
                          disabled
                          className="border-border flex size-12 items-center justify-center rounded-full border-2 bg-surface-code text-brand-blue"
                          aria-label="Ver resumen (mock)"
                        >
                          <IconPlay className="ml-0.5 size-5" />
                        </button>
                      </div>
                    </div>
                    <div className="border-border/60 relative flex aspect-[4/3] w-full shrink-0 items-center justify-center rounded-brand-lg border bg-gradient-to-br from-surface-card to-background sm:aspect-auto sm:h-48 sm:w-48 lg:h-full lg:min-h-[12rem] lg:w-56">
                      <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "var(--tornea-gradient-energy)" }} />
                      <span className="relative text-7xl drop-shadow-[0_0_24px_color-mix(in_srgb,var(--tornea-lime)_50%,transparent)] motion-safe:transition-transform motion-safe:duration-500 motion-safe:hover:scale-110 motion-reduce:transform-none sm:text-8xl">
                        ⚽
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 lg:col-span-5">
                  {sideCards.map((l, i) => (
                    <div
                      key={l.id}
                      className={`${floatCard} motion-safe:hover:rotate-0 flex flex-1 flex-col justify-between p-5 motion-reduce:transform-none ${
                        i === 0 ? "motion-safe:-rotate-1" : "motion-safe:rotate-1"
                      } `}
                    >
                      <div>
                        <p className="text-brand-teal text-[10px] font-bold tracking-widest uppercase">
                          {l.sportLabel}
                        </p>
                        <p className="mt-1 font-bold leading-snug">{l.name}</p>
                        <p className="text-foreground-muted text-xs">{l.seasonLabel}</p>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="border-border bg-background-muted/50 mt-4 w-full rounded-full border py-2 text-xs font-semibold"
                      >
                        Entrar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fila torneos / jornada */}
              <section className="mt-8">
                <div className="mb-3 flex items-end justify-between gap-2">
                  <h2 className="text-lg font-bold tracking-tight">Jornada y competencias</h2>
                  <span className="text-foreground-muted text-xs tabular-nums">
                    {totals.played}+{totals.scheduled} partidos · mock
                  </span>
                </div>
                <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {MOCK_LEAGUES.map((l, i) => {
                    const total = l.stats.matchesPlayed + l.stats.matchesScheduled;
                    const pct = total ? Math.round((l.stats.matchesPlayed / total) * 100) : 0;
                    return (
                      <div
                        key={l.id}
                        className={`${floatCard} w-[min(100%,16rem)] shrink-0 p-4 ${
                          i === 1 ? "motion-safe:-rotate-1" : i === 2 ? "motion-safe:rotate-1" : ""
                        } motion-reduce:transform-none`}
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

              {/* Tabla + resultados */}
              <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-12">
                <div
                  className={`${floatCard} motion-safe:-rotate-2 p-5 motion-reduce:transform-none lg:col-span-5`}
                >
                  <h2 className="text-foreground-muted text-xs font-bold tracking-wide uppercase">
                    Tabla · mock
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {MOCK_STANDINGS.map((row) => (
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
                  <h2 className="text-foreground-muted px-5 pt-5 text-xs font-bold tracking-wide uppercase">
                    Resultados recientes
                  </h2>
                  <ul className="divide-border mt-2 divide-y">
                    {MOCK_RESULTS.map((row) => (
                      <li key={row.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                        <div className="text-2xl opacity-90">⚽</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{row.title}</p>
                          <p className="text-foreground-muted text-xs">Marcador {row.score}</p>
                          <div className="mt-2 flex -space-x-1.5">
                            {["A", "B", "C", "D"].map((x) => (
                              <span
                                key={x}
                                className="border-background flex size-7 items-center justify-center rounded-full border-2 bg-gradient-to-br from-brand-blue/40 to-brand-purple/40 text-[10px] font-bold text-white"
                              >
                                {x}
                              </span>
                            ))}
                          </div>
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

              <footer className="border-border mt-10 flex flex-wrap items-center gap-4 border-t pt-6">
                <button
                  type="button"
                  onClick={() => onSignOut()}
                  disabled={signingOut || !authConfigured}
                  className="text-foreground-muted hover:text-foreground text-sm underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
                </button>
                {email ? (
                  <span className="text-foreground-subtle text-xs">{email}</span>
                ) : null}
                <span className="text-foreground-subtle text-xs">Vista mock · {nav}</span>
              </footer>
            </div>
          </main>

          {/* Chat torneo — desktop */}
          <aside className="border-border bg-background-muted/30 hidden w-[18rem] shrink-0 flex-col border-l backdrop-blur-sm xl:flex 2xl:w-80">
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-bold">Chat del torneo</h2>
              <span className="text-brand-lime text-[10px] font-semibold uppercase">En línea · mock</span>
            </div>
            <div className="flex gap-1 overflow-x-auto px-3 py-2">
              {["KV", "MR", "LP", "AC"].map((x) => (
                <span
                  key={x}
                  className="border-border flex size-8 shrink-0 items-center justify-center rounded-full border bg-surface-code text-[10px] font-bold"
                >
                  {x}
                </span>
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
              {MOCK_CHAT.map((c, i) => (
                <div
                  key={`${c.t}-${i}`}
                  className={`rounded-2xl px-3 py-2 text-sm ${
                    c.who === "Vos"
                      ? "ml-3 border border-brand-teal/25 bg-brand-blue/15"
                      : "border-border mr-3 border bg-surface-code/50"
                  }`}
                >
                  <p className="text-foreground-muted text-[10px] font-semibold">
                    {c.who} · {c.t}
                  </p>
                  <p className="mt-0.5 leading-snug">{c.msg}</p>
                </div>
              ))}
            </div>
            <div className="border-border border-t p-3">
              <div className="border-border flex rounded-full border bg-background-muted/50 p-1 pl-3">
                <input
                  readOnly
                  placeholder="Mensaje…"
                  className="placeholder:text-foreground-muted min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  disabled
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white"
                  aria-label="Enviar"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.52 60.52 0 0 0 18.445-8.588.75.75 0 0 0 0-1.204A60.52 60.52 0 0 0 3.478 2.404Z" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                onClick={() => onSignOut()}
                disabled={signingOut || !authConfigured}
                className="border-border text-foreground-muted mt-3 w-full rounded-full border py-2 text-xs font-medium disabled:opacity-50"
              >
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
