"use client";

import { LeagueAdministratorsSettings } from "../leagues/LeagueAdministratorsSettings";
import type { MyLeaguesApiItem } from "../leagues/my-leagues-state";

import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
} from "./dashboard-view-primitives";

const rows = [
  { id: "1", label: "Perfil y foto", hint: "display_name, avatar_url" },
  { id: "2", label: "Notificaciones", hint: "Email · push · recordatorios de partido" },
  { id: "3", label: "Liga por defecto", hint: "Última competencia activa" },
  { id: "5", label: "Facturación (liga)", hint: "trial · active · past_due — mock" },
];

export function DashboardSettingsView({
  leagueOrgCards,
}: {
  leagueOrgCards: readonly MyLeaguesApiItem[];
}) {
  return (
    <>
      <DashboardViewHeader
        title="Ajustes"
        hint="Preferencias de cuenta y de organización. Algunas secciones aún son demostración."
        actions={<MockActionButton variant="primary">Guardar cambios</MockActionButton>}
      />
      <div className="flex flex-col gap-5">
        <LeagueAdministratorsSettings leagues={leagueOrgCards} />
        <div className={`${floatCard} divide-border divide-y`}>
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{r.label}</p>
                <p className="text-foreground-subtle text-xs">{r.hint}</p>
              </div>
              <MockActionButton variant="secondary" className="shrink-0 !text-xs">
                Configurar
              </MockActionButton>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
