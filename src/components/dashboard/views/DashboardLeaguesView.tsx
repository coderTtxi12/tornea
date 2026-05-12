"use client";

import type {
  MyLeagueCategorySummary,
  MyLeaguesApiItem,
} from "../leagues/my-leagues-state";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
  MockBadge,
} from "./dashboard-view-primitives";

const statusTone: Record<string, "lime" | "blue" | "muted"> = {
  active: "lime",
  draft: "blue",
  archived: "muted",
};

function CategoryChip({ category }: { category: MyLeagueCategorySummary }) {
  return (
    <span
      className="border-border bg-surface-code/50 text-foreground-muted inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
      title={`${category.name} · ${category.code}`}
    >
      {category.name}
    </span>
  );
}

function LeagueShield({
  shieldUrl,
  leagueName,
}: {
  shieldUrl: string | null;
  leagueName: string;
}) {
  if (shieldUrl) {
    return (
      <div className="border-border bg-surface-code/40 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-brand-md border">
        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage host no está
            en `next.config.ts` `images.remotePatterns`. Imagen pequeña (≤2 MiB). */}
        <img
          src={shieldUrl}
          alt={`Escudo de ${leagueName}`}
          className="size-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }
  const initial = leagueName.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="border-border from-brand-lime/40 text-brand-navy flex size-12 shrink-0 items-center justify-center rounded-brand-md border bg-gradient-to-br to-brand-teal/40 font-bold"
      aria-hidden
    >
      {initial}
    </div>
  );
}

function seasonFormatFootnote(formats: readonly (string | null)[]): string {
  const normalized = [
    ...new Set(
      formats.filter((f): f is string => typeof f === "string" && f.length > 0),
    ),
  ];
  if (normalized.length === 0) {
    return "Definí temporadas (`seasons`) para ver formatos (round_robin, grupos, knockout, mixed).";
  }
  const labels: Record<string, string> = {
    round_robin: "round_robin",
    groups: "grupos",
    knockout: "knockout",
    mixed: "mixed",
  };
  return `Formatos en tus temporadas: ${normalized.map((f) => labels[f] ?? f).join(" · ")}`;
}

type DashboardLeaguesViewProps = {
  leagues: readonly MyLeaguesApiItem[];
};

export function DashboardLeaguesView({ leagues }: DashboardLeaguesViewProps) {
  return (
    <>
      <DashboardViewHeader
        title="Ligas y organizaciones"
        hint="Datos de tus ligas (`leagues`): equipos (`teams`) y partidos por temporada (`matches` vía `seasons`). Solo ves ligas donde eres dueño (`owner_user_id`)."
        actions={
          <>
            <MockActionButton variant="primary">Nueva liga</MockActionButton>
            <MockActionButton variant="secondary">Invitar staff</MockActionButton>
          </>
        }
      />
      {leagues.length === 0 ? (
        <p className="text-foreground-muted text-sm">
          No hay ligas que mostrar. Si acabas de crear una, recarga o revisa que sigas como
          dueño.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {leagues.map((l) => (
            <div key={l.id} className={`${floatCard} flex flex-col gap-3 p-5`}>
              <div className="flex items-start gap-3">
                <LeagueShield shieldUrl={l.shieldUrl} leagueName={l.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <MockBadge tone="blue">{l.sportLabel.toUpperCase()}</MockBadge>
                    <MockBadge tone={statusTone[l.status] ?? "muted"}>
                      {l.status.toUpperCase()}
                    </MockBadge>
                  </div>
                  <h2 className="mt-2 font-bold leading-snug">{l.name}</h2>
                  <p className="text-foreground-muted text-sm">{l.seasonLabel}</p>
                </div>
              </div>
              {l.categories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {l.categories.map((c) => (
                    <CategoryChip key={c.id} category={c} />
                  ))}
                </div>
              ) : (
                <p className="text-foreground-subtle text-[11px]">
                  Sin categorías · agrega en ajustes
                </p>
              )}
              <dl className="text-foreground-subtle grid grid-cols-2 gap-2 text-[11px]">
                <dt>Equipos</dt>
                <dd className="text-foreground text-right tabular-nums">{l.teamsTotal}</dd>
                <dt>Partidos jugados</dt>
                <dd className="text-foreground text-right tabular-nums">{l.matchesPlayed}</dd>
                <dt>Pendientes</dt>
                <dd className="text-foreground text-right tabular-nums">{l.matchesPending}</dd>
              </dl>
              <MockActionButton variant="secondary" className="w-full py-2 text-xs">
                Abrir panel
              </MockActionButton>
            </div>
          ))}
        </div>
      )}
      <p className="text-foreground-muted mt-6 text-center text-xs">
        {seasonFormatFootnote(leagues.map((l) => l.seasonFormat))}
      </p>
    </>
  );
}
