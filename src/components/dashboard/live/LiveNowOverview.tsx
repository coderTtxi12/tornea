"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ListOrdered, Play, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";

import { buildIncidentFeedItems } from "./IncidentEventFeed";
import { formatMatchSchedule } from "./live-match-format";
import type { LiveMatchListItem, MatchOperationsBundle } from "./match-operations-types";
import { MockBadge, floatCard } from "../views/dashboard-view-primitives";

type LiveBundleState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; bundles: MatchOperationsBundle[] }
  | { status: "error"; message: string };

export function LiveNowOverview({
  matches,
  onStartLive,
}: {
  matches: readonly LiveMatchListItem[];
  onStartLive: () => void;
}) {
  const liveMatches = useMemo(() => matches.filter((m) => m.status === "live"), [matches]);
  const liveMatchIds = useMemo(() => new Set(liveMatches.map((m) => m.id)), [liveMatches]);
  const [bundleState, setBundleState] = useState<LiveBundleState>({ status: "idle" });
  const visibleBundles =
    bundleState.status === "ready"
      ? bundleState.bundles.filter((bundle) => liveMatchIds.has(bundle.match.id))
      : [];

  useEffect(() => {
    if (liveMatches.length === 0) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setBundleState({ status: "loading" });
      try {
        const results = await Promise.all(
          liveMatches.map(async (match) => {
            const res = await fetch(
              `/api/leagues/${match.leagueId}/matches/${match.id}/operations`,
              { method: "GET" },
            );
            if (!res.ok) return null;
            return (await res.json()) as MatchOperationsBundle;
          }),
        );
        if (!cancelled) {
          setBundleState({
            status: "ready",
            bundles: results.filter((bundle): bundle is MatchOperationsBundle => Boolean(bundle)),
          });
        }
      } catch {
        if (!cancelled) {
          setBundleState({
            status: "error",
            message: "No se pudieron cargar las incidencias en vivo.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [liveMatches]);

  return (
    <div className="space-y-5">
      <section className={`${floatCard} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-brand-teal flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <Radio className="size-4" aria-hidden />
              Ahora en cancha
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Partidos en vivo</h2>
            <p className="text-foreground-muted mt-1 max-w-2xl text-sm leading-relaxed">
              Revisa los encuentros que están pasando ahora y sus incidencias registradas.
            </p>
          </div>
          <Button type="button" onClick={onStartLive} className="shrink-0">
            <Play className="size-4" aria-hidden />
            Iniciar cancha en vivo
          </Button>
        </div>
      </section>

      {bundleState.status === "loading" ? (
        <div className={`${floatCard} border-dashed p-6 text-center`}>
          <p className="text-foreground-muted text-sm">Cargando eventos en vivo...</p>
        </div>
      ) : bundleState.status === "error" ? (
        <div className={`${floatCard} border-dashed p-6 text-center`}>
          <p className="text-foreground-muted text-sm">{bundleState.message}</p>
        </div>
      ) : visibleBundles.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibleBundles.map((bundle) => {
            const feedItems = buildIncidentFeedItems(bundle).slice(0, 4);
            const score = `${bundle.liveScore.home}-${bundle.liveScore.away}`;
            const schedule = formatMatchSchedule(bundle.match.scheduledAt);

            return (
              <article key={bundle.match.id} className={`${floatCard} p-4`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <MockBadge tone="lime">
                      <span className="mr-1 inline-block size-1.5 rounded-full bg-brand-navy motion-safe:animate-pulse" />
                      En vivo
                    </MockBadge>
                    <h3 className="mt-3 truncate text-base font-semibold">
                      {bundle.match.homeTeamName} vs {bundle.match.awayTeamName}
                    </h3>
                    <p className="text-foreground-muted mt-1 truncate text-xs">
                      {[bundle.match.categoryName, schedule, bundle.match.venueName]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="text-brand-lime shrink-0 font-mono text-2xl font-bold tabular-nums">
                    {score}
                  </span>
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground-muted">
                    <ListOrdered className="size-3.5" aria-hidden />
                    Incidencias
                  </div>
                  {feedItems.length > 0 ? (
                    <ul className="space-y-2">
                      {feedItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-brand-md bg-background-muted/30 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 truncate">
                            <span className="font-medium">{item.label}</span>
                            {item.detail ? (
                              <span className="text-foreground-muted"> · {item.detail}</span>
                            ) : null}
                          </span>
                          {item.minute != null ? (
                            <MockBadge tone="lime">{item.minute}&apos;</MockBadge>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-foreground-muted rounded-brand-md border border-dashed border-border px-3 py-4 text-sm">
                      Sin incidencias registradas todavía.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={`${floatCard} border-dashed p-6 text-center`}>
          <CalendarClock className="text-brand-teal mx-auto mb-3 size-7" aria-hidden />
          <p className="font-medium">En este momento no hay eventos en vivo.</p>
          <p className="text-foreground-muted mt-1 text-sm">
            Cuando un partido esté activo, aparecerán aquí sus incidencias al momento.
          </p>
        </div>
      )}

      {matches.length > 0 ? (
        <p className="text-foreground-muted text-xs">
          Hay {matches.length} partido{matches.length === 1 ? "" : "s"} programado
          {matches.length === 1 ? "" : "s"} disponible{matches.length === 1 ? "" : "s"} para
          operar desde el entorno en pantalla completa.
        </p>
      ) : null}
    </div>
  );
}
