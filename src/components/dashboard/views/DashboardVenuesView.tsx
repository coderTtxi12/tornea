"use client";

import type { MyLeaguesApiItem, MyLeaguesVenueRow } from "../leagues/my-leagues-state";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
  MockBadge,
} from "./dashboard-view-primitives";

type DashboardVenuesViewProps = {
  venueRows: readonly MyLeaguesVenueRow[];
  leagueOrgCards: readonly MyLeaguesApiItem[];
  onOpenNewVenueDrawer: () => void;
  onOpenEditVenueDrawer: (args: { leagueId: string; venueId: string }) => void;
};

export function DashboardVenuesView({
  venueRows,
  leagueOrgCards,
  onOpenNewVenueDrawer,
  onOpenEditVenueDrawer,
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
    </>
  );
}
