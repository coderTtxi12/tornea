"use client";

import { MOCK_MATCH_REPORTS } from "../dashboard-mock-data";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
  MockBadge,
} from "./dashboard-view-primitives";

export function DashboardReportsView() {
  return (
    <>
      <DashboardViewHeader
        title="Actas e informes"
        hint="Tipos `match_report_kind`: delegado, árbitro, prensa, interno — cierre y bloqueo (mock)."
        actions={
          <>
            <MockActionButton variant="secondary">Plantillas</MockActionButton>
            <MockActionButton variant="primary">Nueva acta</MockActionButton>
          </>
        }
      />
      <div className={`${floatCard} divide-border divide-y`}>
        {MOCK_MATCH_REPORTS.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">{r.kind}</p>
              <p className="text-foreground-muted text-sm">{r.matchLabel}</p>
              <p className="text-foreground-subtle mt-0.5 text-xs">
                {r.authorRole} · {r.updatedLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MockBadge tone={r.locked ? "muted" : "lime"}>
                {r.locked ? "Cerrada" : "Borrador"}
              </MockBadge>
              <MockActionButton variant="secondary" className="!text-xs">
                Abrir
              </MockActionButton>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
