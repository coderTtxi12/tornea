"use client";

import type {
  MyLeaguesApiItem,
  MyLeaguesRefereeRow,
  MyLeaguesVenueRow,
} from "../leagues/my-leagues-state";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
  MockBadge,
} from "./dashboard-view-primitives";

type DashboardVenuesViewProps = {
  venueRows: readonly MyLeaguesVenueRow[];
  refereeRows: readonly MyLeaguesRefereeRow[];
  leagueOrgCards: readonly MyLeaguesApiItem[];
  onOpenNewVenueDrawer: () => void;
  onOpenEditVenueDrawer: (args: { leagueId: string; venueId: string }) => void;
  onOpenNewRefereeDrawer: () => void;
};

export function DashboardVenuesView({
  venueRows,
  refereeRows,
  leagueOrgCards,
  onOpenNewVenueDrawer,
  onOpenEditVenueDrawer,
  onOpenNewRefereeDrawer,
}: DashboardVenuesViewProps) {
  const hasLeagues = leagueOrgCards.length > 0;

  return (
    <>
      <DashboardViewHeader
        title="Sedes y canchas"
        hint="`venues` por liga; superficie y disponibilidad en `metadata`; fotos en Storage."
        actions={
          <>
            <MockActionButton variant="secondary">Mapa</MockActionButton>
            <button
              type="button"
              onClick={onOpenNewVenueDrawer}
              disabled={!hasLeagues}
              className="shrink-0 cursor-pointer rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Nueva cancha
            </button>
          </>
        }
      />

      {!hasLeagues ? (
        <p className="text-foreground-muted text-sm">
          Creá una liga primero para registrar canchas.
        </p>
      ) : venueRows.length === 0 ? (
        <p className="text-foreground-muted text-sm">
          Todavía no hay canchas registradas. Usá &quot;Nueva cancha&quot; para agregar la primera.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {venueRows.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onOpenEditVenueDrawer({ leagueId: v.leagueId, venueId: v.id })}
            className={`${floatCard} flex w-full cursor-pointer flex-col gap-3 p-5 text-left outline-none transition-[opacity,box-shadow] hover:opacity-[0.97] focus-visible:ring-2 focus-visible:ring-brand-teal`}
            aria-label={`Editar cancha ${v.name}, ${v.leagueName}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{v.name}</h2>
              <MockBadge tone="blue">{v.badgeLabel}</MockBadge>
            </div>
            <p className="text-foreground-muted text-sm">
              {v.surface ?? "Superficie no indicada"}
            </p>
            {v.address ? (
              <p className="text-foreground-subtle text-xs leading-relaxed">{v.address}</p>
            ) : null}
            <p className="text-foreground-subtle text-xs">
              {v.leagueName}
              {v.photoCount > 0 ? ` · ${v.photoCount} foto${v.photoCount === 1 ? "" : "s"}` : ""}
              {v.hasAvailabilityNotes ? " · disponibilidad registrada" : ""}
            </p>
          </button>
        ))}
      </div>

      <section className="mt-12 flex flex-col gap-4" aria-labelledby="venues-referees-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="venues-referees-heading"
              className="text-foreground text-base font-bold tracking-tight sm:text-lg"
            >
              Árbitros
            </h2>
            <p className="text-foreground-muted mt-1 text-xs sm:text-sm">
              Directorio en <code className="text-foreground-muted text-[11px]">league_referees</code>{" "}
              por liga. Contacto para asignaciones; distinto de{" "}
              <code className="text-foreground-muted text-[11px]">match_officials</code> (usuarios en
              partidos).
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenNewRefereeDrawer}
            disabled={!hasLeagues}
            title={hasLeagues ? undefined : "Primero creá una liga"}
            className="shrink-0 cursor-pointer rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Agregar árbitro
          </button>
        </div>

        {!hasLeagues ? (
          <p className="text-foreground-muted text-sm">Creá una liga para registrar árbitros.</p>
        ) : refereeRows.length === 0 ? (
          <p className="text-foreground-muted text-sm">
            Aún no hay árbitros en el directorio. Usá &quot;Agregar árbitro&quot; para el primero.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {refereeRows.map((r) => (
              <article
                key={r.id}
                className={`${floatCard} flex flex-col gap-3 p-5`}
              >
                <div className="flex items-start gap-3">
                  {r.profileImageUrl ? (
                    <div className="border-border bg-surface-code/40 size-12 shrink-0 overflow-hidden rounded-full border">
                      {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada / pública */}
                      <img
                        src={r.profileImageUrl}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div
                      className="border-border from-brand-lime/40 text-brand-navy flex size-12 shrink-0 items-center justify-center rounded-full border bg-gradient-to-br to-brand-teal/40 text-sm font-bold"
                      aria-hidden
                    >
                      {r.fullName.trim().charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold leading-snug">{r.fullName}</h3>
                    <p className="text-foreground-muted mt-0.5 text-xs">{r.leagueName}</p>
                  </div>
                </div>
                <dl className="text-foreground-subtle grid gap-x-3 gap-y-1 text-[11px] sm:grid-cols-2">
                  <dt>WhatsApp</dt>
                  <dd className="text-foreground font-mono text-right text-[10px] sm:col-span-1">
                    {r.whatsapp}
                  </dd>
                  {r.email ? (
                    <>
                      <dt>Correo</dt>
                      <dd className="text-foreground truncate text-right text-[10px] sm:col-span-1">
                        {r.email}
                      </dd>
                    </>
                  ) : null}
                  {r.curpDownloadUrl ? (
                    <>
                      <dt>CURP</dt>
                      <dd className="text-right text-[10px] sm:col-span-1">
                        <a
                          href={r.curpDownloadUrl}
                          className="text-brand-teal hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Descargar archivo
                        </a>
                      </dd>
                    </>
                  ) : r.curpLegacyText ? (
                    <>
                      <dt>CURP</dt>
                      <dd className="text-foreground font-mono text-right text-[10px] sm:col-span-1">
                        {r.curpLegacyText}
                      </dd>
                    </>
                  ) : null}
                </dl>
                {r.notes ? (
                  <p className="text-foreground-muted border-border line-clamp-3 border-t pt-2 text-xs leading-relaxed">
                    {r.notes}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
