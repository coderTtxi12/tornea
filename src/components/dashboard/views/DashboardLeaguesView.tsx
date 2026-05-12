"use client";

import { MOCK_LEAGUES } from "../dashboard-mock-data";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
  MockBadge,
} from "./dashboard-view-primitives";

const statusTone = {
  active: "lime" as const,
  draft: "blue" as const,
  archived: "muted" as const,
};

export function DashboardLeaguesView() {
  return (
    <>
      <DashboardViewHeader
        title="Ligas y organizaciones"
        hint="Multi-tenant por `leagues`: dueño, facturación y miembros con roles (`league_members`). Todo mock."
        actions={
          <>
            <MockActionButton variant="primary">Nueva liga</MockActionButton>
            <MockActionButton variant="secondary">Invitar staff</MockActionButton>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK_LEAGUES.map((l) => (
          <div key={l.id} className={`${floatCard} flex flex-col gap-3 p-5`}>
            <div className="flex flex-wrap items-center gap-2">
              <MockBadge tone="blue">{l.sportLabel}</MockBadge>
              <MockBadge tone={statusTone[l.status]}>{l.status}</MockBadge>
            </div>
            <div>
              <h2 className="font-bold leading-snug">{l.name}</h2>
              <p className="text-foreground-muted text-sm">{l.seasonLabel}</p>
            </div>
            <dl className="text-foreground-subtle grid grid-cols-2 gap-2 text-[11px]">
              <dt>Equipos</dt>
              <dd className="text-foreground text-right tabular-nums">{l.stats.teamsTotal}</dd>
              <dt>Partidos jugados</dt>
              <dd className="text-foreground text-right tabular-nums">{l.stats.matchesPlayed}</dd>
              <dt>Pendientes</dt>
              <dd className="text-foreground text-right tabular-nums">{l.stats.matchesScheduled}</dd>
            </dl>
            <MockActionButton variant="secondary" className="w-full py-2 text-xs">
              Abrir panel
            </MockActionButton>
          </div>
        ))}
      </div>
      <p className="text-foreground-muted mt-6 text-center text-xs">Formatos: round_robin · grupos · knockout · mixed · UI pendiente</p>
    </>
  );
}
