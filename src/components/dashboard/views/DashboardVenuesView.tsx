"use client";

import { MOCK_VENUES } from "../dashboard-mock-data";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
  MockBadge,
} from "./dashboard-view-primitives";

export function DashboardVenuesView() {
  return (
    <>
      <DashboardViewHeader
        title="Sedes y canchas"
        hint="`venues` por liga; uso en partidos y disponibilidad de fixture (mock)."
        actions={
          <>
            <MockActionButton variant="secondary">Mapa</MockActionButton>
            <MockActionButton variant="primary">Nueva sede</MockActionButton>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {MOCK_VENUES.map((v) => (
          <div key={v.id} className={`${floatCard} flex flex-col gap-3 p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{v.name}</h2>
              <MockBadge tone="blue">{v.shortName}</MockBadge>
            </div>
            <p className="text-foreground-muted text-sm">{v.surface}</p>
            <p className="text-foreground-subtle text-xs">
              {v.leaguesUsing} competencias programan aquí · mock
            </p>
            <div className="flex flex-wrap gap-2">
              <MockActionButton variant="secondary" className="!text-xs">
                Disponibilidad
              </MockActionButton>
              <MockActionButton variant="secondary" className="!text-xs">
                Fotos
              </MockActionButton>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
