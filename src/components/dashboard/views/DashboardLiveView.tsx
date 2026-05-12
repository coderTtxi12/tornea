"use client";

import { MOCK_LIVE_MATCHES } from "../dashboard-mock-data";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
  MockBadge,
} from "./dashboard-view-primitives";

export function DashboardLiveView() {
  return (
    <>
      <DashboardViewHeader
        title="Cancha · En vivo"
        hint="Marcador, periodos y eventos (`match_status`, goles, tarjetas). Sin datos reales todavía."
        actions={
          <>
            <MockActionButton variant="secondary">Modo TV</MockActionButton>
            <MockActionButton variant="primary">Abrir planilla</MockActionButton>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {MOCK_LIVE_MATCHES.map((m) => (
          <div key={m.id} className={`${floatCard} p-6`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <MockBadge tone="lime">{m.minute}</MockBadge>
              <span className="text-foreground-muted text-xs">{m.period}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
              <div>
                <p className="font-bold leading-tight">{m.home}</p>
                <p className="text-foreground-subtle text-xs">Local</p>
              </div>
              <p className="text-3xl font-black tabular-nums tracking-tight">{m.score}</p>
              <div>
                <p className="font-bold leading-tight">{m.away}</p>
                <p className="text-foreground-subtle text-xs">Visitante</p>
              </div>
            </div>
            <p className="text-foreground-muted mt-4 text-center text-xs">{m.venue}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <MockActionButton variant="secondary" className="!text-xs">
                Gol
              </MockActionButton>
              <MockActionButton variant="secondary" className="!text-xs">
                Tarjeta
              </MockActionButton>
              <MockActionButton variant="secondary" className="!text-xs">
                Cambio
              </MockActionButton>
              <MockActionButton variant="primary" className="!text-xs">
                Finalizar
              </MockActionButton>
            </div>
          </div>
        ))}
        <div className={`${floatCard} border-dashed p-6`}>
          <p className="text-foreground-muted text-sm leading-relaxed">
            Cola de eventos (VAR, lesiones, `sport_match_events`) aparecerá aquí cuando conectemos backend.
          </p>
          <ul className="text-foreground-subtle mt-4 space-y-2 text-xs">
            <li>· Gol — Valdivieso 23′ (mock)</li>
            <li>· Amarilla — Carrera 41′ (mock)</li>
            <li>· Lesión — revisión médica (mock)</li>
          </ul>
        </div>
      </div>
    </>
  );
}
