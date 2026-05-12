"use client";

import { MOCK_LEAGUES } from "../dashboard-mock-data";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
  MockBadge,
} from "./dashboard-view-primitives";

export function DashboardTeamsView() {
  const rows = MOCK_LEAGUES.flatMap((l) =>
    l.teams.map((t) => ({ ...t, leagueName: l.name })),
  );

  return (
    <>
      <DashboardViewHeader
        title="Equipos"
        hint="Clubes en liga e inscripción por temporada (`teams`, `season_teams`). Mock listado unificado."
        actions={
          <>
            <MockActionButton variant="secondary">Importar CSV</MockActionButton>
            <MockActionButton variant="primary">Registrar equipo</MockActionButton>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((t) => (
          <div key={t.id} className={`${floatCard} flex flex-col gap-2 p-4`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold leading-snug">{t.name}</p>
                <p className="text-foreground-muted text-xs">{t.leagueName}</p>
              </div>
              <MockBadge tone={t.status === "active" ? "lime" : "muted"}>{t.shortName}</MockBadge>
            </div>
            <p className="text-foreground-subtle text-[11px]">
              {t.playersCount} jugadores · {t.status === "active" ? "Activo" : "Inactivo"}
            </p>
            <MockActionButton variant="secondary" className="mt-1 w-full py-2 text-xs">
              Plantilla y fichas
            </MockActionButton>
          </div>
        ))}
      </div>
    </>
  );
}
