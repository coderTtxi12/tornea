"use client";

import { useEffect, useState } from "react";

import type { MyLeaguesMatchRow } from "@/components/dashboard/leagues/my-leagues-state";

import { MockActionButton, floatCard } from "./views/dashboard-view-primitives";

function startOfLocalDayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Partidos no cerrados a partir de hoy (hora local); «live» siempre. */
function selectUpcomingRailMatches(rows: MyLeaguesMatchRow[]): MyLeaguesMatchRow[] {
  const dayStart = startOfLocalDayMs();
  const filtered = rows.filter((m) => {
    if (m.status === "finished" || m.status === "cancelled") return false;
    if (m.status === "live") return true;
    const t = Date.parse(m.scheduledAt);
    if (Number.isNaN(t)) return false;
    return t >= dayStart;
  });
  filtered.sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  return filtered.slice(0, 4);
}

function formatRailKickoffParts(iso: string, timeZone: string): { dayLabel: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { dayLabel: "—", time: "—" };
  const tz = timeZone?.trim();
  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: tz || undefined,
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz || undefined,
  };
  try {
    let dayLabel = d.toLocaleDateString("es-MX", dateOpts).replace(/\.$/, "");
    if (dayLabel.length > 0) {
      dayLabel = dayLabel.charAt(0).toLocaleUpperCase("es-MX") + dayLabel.slice(1);
    }
    const time = d.toLocaleTimeString("es-MX", timeOpts);
    return { dayLabel, time };
  } catch {
    const dayLabel = d
      .toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })
      .replace(/\.$/, "");
    const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
    return { dayLabel: dayLabel || "—", time };
  }
}

function matchStatusLabel(status: string): string {
  const m: Record<string, string> = {
    scheduled: "Prog.",
    live: "En vivo",
    finished: "Final",
    postponed: "Aplaz.",
    cancelled: "Canc.",
    walkover: "WO",
  };
  return m[status] ?? status.slice(0, 4).toUpperCase() + ".";
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

type UpcomingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: MyLeaguesMatchRow[] };

export function DashboardRightRail({ refreshKey }: { refreshKey: number }) {
  const [rail, setRail] = useState<RailApiResponse | null>(null);
  const [railError, setRailError] = useState<string | null>(null);
  const [upcomingState, setUpcomingState] = useState<UpcomingState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    setRailError(null);
    setUpcomingState({ status: "loading" });
    void (async () => {
      try {
        const [railRes, matchesRes] = await Promise.all([
          fetch("/api/dashboard/rail", { credentials: "same-origin" }),
          fetch("/api/leagues/my/matches", { credentials: "same-origin", method: "GET" }),
        ]);
        if (cancelled) return;

        if (railRes.status === 401 || matchesRes.status === 401) {
          window.location.href = "/";
          return;
        }

        if (!railRes.ok) {
          setRail(null);
          setRailError("No se pudo cargar actividad.");
        } else {
          const data = (await railRes.json()) as RailApiResponse;
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
          } else {
            setRail(data);
          }
        }

        if (!matchesRes.ok) {
          if (!cancelled) {
            setUpcomingState({
              status: "error",
              message: "No se pudieron cargar los próximos partidos.",
            });
          }
        } else {
          const raw = (await matchesRes.json()) as { matches?: unknown };
          const list = Array.isArray(raw.matches) ? raw.matches : [];
          const valid = list.every(
            (x) =>
              typeof x === "object" &&
              x !== null &&
              typeof (x as MyLeaguesMatchRow).id === "string" &&
              typeof (x as MyLeaguesMatchRow).scheduledAt === "string" &&
              typeof (x as MyLeaguesMatchRow).timezone === "string" &&
              typeof (x as MyLeaguesMatchRow).homeTeamName === "string" &&
              typeof (x as MyLeaguesMatchRow).awayTeamName === "string" &&
              typeof (x as MyLeaguesMatchRow).status === "string",
          );
          if (cancelled) return;
          if (!valid) {
            setUpcomingState({ status: "error", message: "Respuesta de partidos inválida." });
          } else {
            setUpcomingState({
              status: "ready",
              rows: selectUpcomingRailMatches(list as MyLeaguesMatchRow[]),
            });
          }
        }
      } catch {
        if (!cancelled) {
          setRail(null);
          setRailError("Error de red.");
          setUpcomingState({ status: "error", message: "Error de red." });
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
            Próximos partidos · actividad y pendientes desde tu liga
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <section className="border-border border-b px-3 py-3">
            <h3 className="text-foreground-muted px-1 pb-2 text-[10px] font-bold tracking-wide uppercase">
              Próximos partidos
            </h3>
            {upcomingState.status === "loading" || upcomingState.status === "idle" ? (
              <p className="text-foreground-muted px-1 text-xs">Cargando…</p>
            ) : upcomingState.status === "error" ? (
              <p className="text-foreground-muted px-1 text-xs">{upcomingState.message}</p>
            ) : upcomingState.rows.length === 0 ? (
              <p className="text-foreground-muted px-1 text-xs">Sin partidos próximos.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingState.rows.map((m) => {
                  const { dayLabel, time } = formatRailKickoffParts(m.scheduledAt, m.timezone);
                  return (
                    <li
                      key={m.id}
                      className="border-border bg-surface-code/25 rounded-brand-md border px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-foreground-muted text-[10px] tabular-nums">
                          {dayLabel} · {time}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase ${m.status === "live" ? "text-brand-lime" : "text-foreground-subtle"}`}
                        >
                          {matchStatusLabel(m.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium leading-tight">
                        {m.homeTeamName} vs {m.awayTeamName}
                      </p>
                      <p className="text-foreground-subtle mt-0.5 text-[10px] leading-snug">
                        {m.venueName?.trim() ? m.venueName : "Sin sede"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
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
