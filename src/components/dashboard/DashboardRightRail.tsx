"use client";

import { useEffect, useState } from "react";

import { MOCK_FIXTURE_ROWS } from "./dashboard-mock-data";
import { MockActionButton, floatCard } from "./views/dashboard-view-primitives";

function matchStatusLabel(s: (typeof MOCK_FIXTURE_ROWS)[0]["matchStatus"]) {
  const m: Record<typeof s, string> = {
    scheduled: "Prog.",
    live: "En vivo",
    finished: "Final",
    postponed: "Aplaz.",
  };
  return m[s];
}

type RailApiRecent = {
  id: string;
  summary: string;
  actorLabel: string;
  leagueName: string | null;
  createdAt: string;
  relativeTime: string;
};

type RailApiPending = {
  id: string;
  title: string;
  subtitle: string;
  urgent: boolean;
};

type RailApiResponse = {
  managedLeagueCount: number;
  recentActivity: RailApiRecent[];
  pendingItems: RailApiPending[];
};

export function DashboardRightRail({ refreshKey }: { refreshKey: number }) {
  const upcoming = MOCK_FIXTURE_ROWS.filter((r) => r.matchStatus !== "finished").slice(0, 4);

  const [rail, setRail] = useState<RailApiResponse | null>(null);
  const [railError, setRailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRailError(null);
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/rail", { credentials: "same-origin" });
        if (cancelled) return;
        if (!res.ok) {
          setRail(null);
          setRailError("No se pudo cargar actividad.");
          return;
        }
        const data = (await res.json()) as RailApiResponse;
        if (cancelled) return;
        if (
          !Array.isArray(data.recentActivity) ||
          !Array.isArray(data.pendingItems) ||
          typeof data.managedLeagueCount !== "number" ||
          data.recentActivity.some(
            (x) =>
              typeof x !== "object" ||
              x === null ||
              typeof (x as RailApiRecent).actorLabel !== "string",
          )
        ) {
          setRail(null);
          setRailError("Respuesta inválida.");
          return;
        }
        setRail(data);
      } catch {
        if (!cancelled) {
          setRail(null);
          setRailError("Error de red.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const showLeagueOnActivity = (rail?.managedLeagueCount ?? 0) > 1;

  return (
    <aside className="hidden min-h-0 w-[18rem] shrink-0 flex-col py-5 pr-3 sm:pr-5 lg:py-8 lg:pr-6 xl:flex xl:flex-col 2xl:w-80">
      <div className={`${floatCard} flex min-h-0 flex-1 flex-col overflow-hidden`}>
        <div className="border-border border-b px-4 py-3">
          <h2 className="text-sm font-bold">Agenda y pendientes</h2>
          <p className="text-foreground-muted mt-0.5 text-[11px] leading-snug">
            Próximos partidos (demo) · actividad y pendientes desde tu liga
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <section className="border-border border-b px-3 py-3">
            <h3 className="text-foreground-muted px-1 pb-2 text-[10px] font-bold tracking-wide uppercase">
              Próximos partidos
            </h3>
            <ul className="space-y-2">
              {upcoming.map((m) => (
                <li
                  key={m.id}
                  className="border-border bg-surface-code/25 rounded-brand-md border px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-foreground-muted text-[10px] tabular-nums">
                      {m.dayLabel} · {m.time}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase ${m.matchStatus === "live" ? "text-brand-lime" : "text-foreground-subtle"}`}
                    >
                      {matchStatusLabel(m.matchStatus)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium leading-tight">
                    {m.home} vs {m.away}
                  </p>
                  <p className="text-foreground-subtle mt-0.5 text-[10px] leading-snug">{m.venue}</p>
                </li>
              ))}
            </ul>
          </section>

          {rail && rail.pendingItems.length > 0 ? (
            <section className="border-border border-b px-3 py-3">
              <h3 className="text-foreground-muted px-1 pb-2 text-[10px] font-bold tracking-wide uppercase">
                Pendientes
              </h3>
              <ul className="space-y-2">
                {rail.pendingItems.map((t) => (
                  <li
                    key={t.id}
                    className={`rounded-brand-md border px-2.5 py-2 text-xs ${
                      t.urgent
                        ? "border-brand-teal/35 bg-brand-blue/10"
                        : "border-border bg-surface-code/20"
                    }`}
                  >
                    <p className="font-semibold leading-snug">{t.title}</p>
                    <p className="text-foreground-muted mt-0.5 text-[10px]">{t.subtitle}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="px-3 py-3">
            <h3 className="text-foreground-muted px-1 pb-2 text-[10px] font-bold tracking-wide uppercase">
              Actividad reciente
            </h3>
            {railError ? (
              <p className="text-foreground-muted px-1 text-xs">{railError}</p>
            ) : !rail ? (
              <p className="text-foreground-muted px-1 text-xs">Cargando…</p>
            ) : rail.recentActivity.length === 0 ? (
              <p className="text-foreground-muted px-1 text-xs">Sin actividad reciente.</p>
            ) : (
              <ul className="space-y-2">
                {rail.recentActivity.map((a) => (
                  <li
                    key={a.id}
                    className="border-border flex gap-2 border-l-2 border-brand-teal/40 pl-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-snug">{a.summary}</p>
                      <p className="text-foreground-muted mt-0.5 text-[10px] leading-snug">
                        Por {a.actorLabel}
                      </p>
                      {showLeagueOnActivity && a.leagueName ? (
                        <p className="text-foreground-muted mt-0.5 text-[10px] leading-snug">
                          {a.leagueName}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-foreground-subtle shrink-0 text-[10px] tabular-nums">
                      {a.relativeTime}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="border-border mt-auto border-t p-3">
            <MockActionButton variant="secondary" className="w-full py-2 text-xs">
              Abrir fixture completo
            </MockActionButton>
          </div>
        </div>
      </div>
    </aside>
  );
}
