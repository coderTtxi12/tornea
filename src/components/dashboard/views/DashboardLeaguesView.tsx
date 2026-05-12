"use client";

import { useMemo, useState } from "react";

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

const genderLabelMx: Record<MyLeagueCategorySummary["gender"], string> = {
  male: "Varonil",
  female: "Femenil",
  mixed: "Mixto",
  unspecified: "Sin género",
};

const genderBadgeTone: Record<MyLeagueCategorySummary["gender"], "blue" | "lime" | "warn" | "muted"> = {
  male: "blue",
  female: "warn",
  mixed: "lime",
  unspecified: "muted",
};

/** "12 may 2026" en español; ISO inválido → "—". */
function formatDateEsShort(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function CategoryDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className="text-foreground text-right">{value}</dd>
    </>
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
  onOpenNewLeagueDrawer: () => void;
  onOpenNewCategoryDrawer: (args: { leagueId: string; leagueName: string }) => void;
};

export function DashboardLeaguesView({
  leagues,
  onOpenNewLeagueDrawer,
  onOpenNewCategoryDrawer,
}: DashboardLeaguesViewProps) {
  /** `null` = usar la primera liga de la lista (orden de la API / DB). */
  const [pickedLeagueId, setPickedLeagueId] = useState<string | null>(null);
  /** `null` = usar la primera categoría de la liga efectiva (`sort_order`, nombre). */
  const [pickedCategoryId, setPickedCategoryId] = useState<string | null>(null);

  const effectiveLeagueId = useMemo(() => {
    if (leagues.length === 0) return null;
    if (pickedLeagueId && leagues.some((l) => l.id === pickedLeagueId)) {
      return pickedLeagueId;
    }
    return leagues[0]!.id;
  }, [leagues, pickedLeagueId]);

  const selectedLeague = useMemo(
    () => (effectiveLeagueId ? (leagues.find((l) => l.id === effectiveLeagueId) ?? null) : null),
    [effectiveLeagueId, leagues],
  );

  /**
   * Categoría seleccionada por el usuario (o `null` si nunca tocó una para esta liga). No
   * autoseleccionamos la primera: queremos que el panel arranque sin contexto de categoría.
   */
  const effectiveCategoryId = useMemo(() => {
    if (!selectedLeague || !pickedCategoryId) return null;
    return selectedLeague.categories.some((c) => c.id === pickedCategoryId)
      ? pickedCategoryId
      : null;
  }, [pickedCategoryId, selectedLeague]);

  return (
    <>
      <DashboardViewHeader
        title="Ligas y organizaciones"
        hint="Datos de tus ligas (`leagues`): equipos (`teams`) y partidos por temporada (`matches` vía `seasons`). Solo ves ligas donde eres dueño (`owner_user_id`)."
        actions={
          <>
            <button
              type="button"
              onClick={onOpenNewLeagueDrawer}
              className="cursor-pointer rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95"
            >
              Nueva liga
            </button>
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
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {leagues.map((l) => {
              const isSelected = l.id === effectiveLeagueId;
              return (
                <article
                  key={l.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`Seleccionar liga ${l.name}`}
                  onClick={() => {
                    setPickedLeagueId(l.id);
                    setPickedCategoryId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPickedLeagueId(l.id);
                      setPickedCategoryId(null);
                    }
                  }}
                  className={`${floatCard} flex cursor-pointer flex-col gap-3 p-5 outline-none transition-[box-shadow,ring] focus-visible:ring-2 focus-visible:ring-brand-teal ${
                    isSelected
                      ? "ring-brand-lime ring-2 ring-offset-2 ring-offset-background"
                      : "hover:ring-border hover:ring-1"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <LeagueShield shieldUrl={l.shieldUrl} leagueName={l.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <MockBadge tone="blue">{l.sportLabel.toUpperCase()}</MockBadge>
                      </div>
                      <h2 className="mt-2 font-bold leading-snug">{l.name}</h2>
                    </div>
                  </div>
                  {l.categories.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {l.categories.map((c) => (
                        <CategoryChip key={c.id} category={c} />
                      ))}
                    </div>
                  ) : null}
                  <dl className="text-foreground-subtle grid grid-cols-2 gap-2 text-[11px]">
                    {l.categories.length === 0 ? (
                      <>
                        <dt>Categorías</dt>
                        <dd className="text-foreground text-right tabular-nums">0</dd>
                      </>
                    ) : null}
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
                </article>
              );
            })}
          </div>

          {selectedLeague ? (
            <section className="flex flex-col gap-4" aria-labelledby="league-categories-heading">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2
                    id="league-categories-heading"
                    className="text-foreground text-base font-bold tracking-tight sm:text-lg"
                  >
                    Categorías
                    <span className="text-foreground-muted font-normal">
                      {" "}
                      · {selectedLeague.name}
                    </span>
                  </h2>
                  <p className="text-foreground-muted mt-1 text-xs sm:text-sm">
                    Categorías (`league_categories`) que corren en paralelo dentro de esta liga.
                    Selecciona una para fijar el contexto del panel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onOpenNewCategoryDrawer({
                      leagueId: selectedLeague.id,
                      leagueName: selectedLeague.name,
                    })
                  }
                  className="shrink-0 cursor-pointer rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95"
                >
                  Agregar categoría
                </button>
              </div>

              {selectedLeague.categories.length === 0 ? (
                <p className="text-foreground-muted text-sm">
                  Esta liga aún no tiene categorías. Usa <span className="text-foreground font-medium">Agregar categoría</span> para crear la primera (por ejemplo Varonil, Femenil, Sub-15).
                </p>
              ) : (
                <div
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  aria-label="Categorías de la liga"
                >
                  {selectedLeague.categories.map((c) => {
                    const active = c.id === effectiveCategoryId;
                    return (
                      <article
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={active}
                        aria-label={`Seleccionar categoría ${c.name}`}
                        onClick={() => setPickedCategoryId(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setPickedCategoryId(c.id);
                          }
                        }}
                        className={`${floatCard} flex cursor-pointer flex-col gap-3 p-5 outline-none transition-[box-shadow,ring] focus-visible:ring-2 focus-visible:ring-brand-teal ${
                          active
                            ? "ring-brand-lime ring-2 ring-offset-2 ring-offset-background"
                            : "hover:ring-border hover:ring-1"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <MockBadge tone={genderBadgeTone[c.gender]}>
                            {genderLabelMx[c.gender].toUpperCase()}
                          </MockBadge>
                        </div>
                        <h3 className="font-bold leading-snug">{c.name}</h3>
                        <dl className="text-foreground-subtle grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11px]">
                          <dt>Código</dt>
                          <dd className="text-foreground text-right font-mono">{c.code}</dd>
                          <CategoryDetailRow label="Género" value={genderLabelMx[c.gender]} />
                          {c.ageMin != null ? (
                            <CategoryDetailRow label="Edad mínima" value={`${c.ageMin} años`} />
                          ) : null}
                          {c.ageMax != null ? (
                            <CategoryDetailRow label="Edad máxima" value={`${c.ageMax} años`} />
                          ) : null}
                          {c.birthYearMin != null ? (
                            <CategoryDetailRow
                              label="Año nac. mínimo"
                              value={String(c.birthYearMin)}
                            />
                          ) : null}
                          {c.birthYearMax != null ? (
                            <CategoryDetailRow
                              label="Año nac. máximo"
                              value={String(c.birthYearMax)}
                            />
                          ) : null}
                          {c.minTeamsToStart != null ? (
                            <CategoryDetailRow
                              label="Equipos mín."
                              value={String(c.minTeamsToStart)}
                            />
                          ) : null}
                          <CategoryDetailRow label="Fecha de creación" value={formatDateEsShort(c.createdAt)} />
                        </dl>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}
        </div>
      )}
      <p className="text-foreground-muted mt-6 text-center text-xs">
        {seasonFormatFootnote(leagues.map((l) => l.seasonFormat))}
      </p>
    </>
  );
}
