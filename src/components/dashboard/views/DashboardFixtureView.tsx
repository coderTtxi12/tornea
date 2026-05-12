"use client";

import { MOCK_FIXTURE_ROWS } from "../dashboard-mock-data";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
  MockBadge,
} from "./dashboard-view-primitives";

function statusLabel(s: (typeof MOCK_FIXTURE_ROWS)[0]["matchStatus"]) {
  const map: Record<typeof s, string> = {
    scheduled: "Programado",
    live: "En vivo",
    finished: "Final",
    postponed: "Aplazado",
  };
  return map[s];
}

export function DashboardFixtureView() {
  return (
    <>
      <DashboardViewHeader
        title="Fixture y jornadas"
        hint="Partidos anclados a `season_id`, equipos validados vía `season_teams`. Generación de fixture y jornadas — mock."
        actions={
          <>
            <MockActionButton variant="secondary">Semana anterior</MockActionButton>
            <MockActionButton variant="secondary">Semana siguiente</MockActionButton>
            <MockActionButton variant="primary">Nuevo partido</MockActionButton>
          </>
        }
      />
      <div className={`${floatCard} overflow-hidden`}>
        <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <p className="text-sm font-semibold">Semana del 9 al 16 jun · Clausura 2026</p>
          <MockActionButton variant="ghost" className="!text-xs">
            Exportar PDF
          </MockActionButton>
        </div>
        <ul className="divide-border divide-y">
          {MOCK_FIXTURE_ROWS.map((m) => (
            <li key={m.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <MockBadge tone="muted">{m.roundLabel}</MockBadge>
                <span className="text-foreground-muted text-xs tabular-nums">
                  {m.dayLabel} · {m.time}
                </span>
              </div>
              <p className="min-w-0 flex-1 text-sm font-medium sm:text-center">
                {m.home} <span className="text-foreground-muted px-1">vs</span> {m.away}
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="text-foreground-subtle text-xs">{m.venue}</span>
                <MockBadge tone={m.matchStatus === "live" ? "lime" : m.matchStatus === "finished" ? "blue" : "muted"}>
                  {statusLabel(m.matchStatus)}
                </MockBadge>
                <MockActionButton variant="secondary" className="!px-3 !py-1 !text-xs">
                  Detalle
                </MockActionButton>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
