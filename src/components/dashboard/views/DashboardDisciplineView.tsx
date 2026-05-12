"use client";

import { MOCK_SANCTIONS } from "../dashboard-mock-data";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
  MockBadge,
} from "./dashboard-view-primitives";

export function DashboardDisciplineView() {
  return (
    <>
      <DashboardViewHeader
        title="Disciplina y sanciones"
        hint="Capas separadas: tarjetas en acta (`match_cards`), faltas (`match_fouls`), sanciones de competencia (`sanctions`)."
        actions={
          <>
            <MockActionButton variant="secondary">Historial</MockActionButton>
            <MockActionButton variant="primary">Registrar sanción</MockActionButton>
          </>
        }
      />
      <ul className="space-y-3">
        {MOCK_SANCTIONS.map((s) => (
          <li key={s.id} className={`${floatCard} flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <p className="font-semibold">{s.subject}</p>
              <p className="text-foreground-muted text-xs">{s.linkedMatch}</p>
              <p className="text-foreground-subtle mt-1 text-[11px]">
                {s.kind} · {s.scope}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MockBadge tone={s.status === "Activa" ? "warn" : "muted"}>{s.status}</MockBadge>
              <MockActionButton variant="secondary" className="!text-xs">
                Expediente
              </MockActionButton>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
