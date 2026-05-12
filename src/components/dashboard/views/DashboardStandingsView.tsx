"use client";

import { MOCK_STANDINGS_TABLE } from "../dashboard-mock-data";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
} from "./dashboard-view-primitives";

export function DashboardStandingsView() {
  return (
    <>
      <DashboardViewHeader
        title="Tabla de posiciones"
        hint="Clasificación por temporada — criterios de desempate se definirán en dominio (mock)."
        actions={
          <>
            <MockActionButton variant="secondary">Desempates</MockActionButton>
            <MockActionButton variant="primary">Exportar</MockActionButton>
          </>
        }
      />
      <div className={`${floatCard} overflow-x-auto`}>
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="text-foreground-muted border-border border-b text-[10px] font-bold tracking-wide uppercase">
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Equipo</th>
              <th className="px-3 py-3 text-right">PJ</th>
              <th className="px-3 py-3 text-right">PG</th>
              <th className="px-3 py-3 text-right">PE</th>
              <th className="px-3 py-3 text-right">PP</th>
              <th className="px-3 py-3 text-right">GF</th>
              <th className="px-3 py-3 text-right">GC</th>
              <th className="px-3 py-3 text-right">DIF</th>
              <th className="px-3 py-3 text-right">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {MOCK_STANDINGS_TABLE.map((r) => {
              const diff = r.gf - r.gc;
              return (
                <tr key={r.place} className="hover:bg-surface-code/15">
                  <td className="text-brand-lime w-10 px-3 py-2.5 text-center text-sm font-black tabular-nums">
                    {r.place}
                  </td>
                  <td className="max-w-[10rem] truncate px-3 py-2.5 font-medium sm:max-w-none">
                    {r.team}
                  </td>
                  <td className="text-foreground-muted px-3 py-2.5 text-right tabular-nums">{r.pj}</td>
                  <td className="text-foreground-muted px-3 py-2.5 text-right tabular-nums">{r.pg}</td>
                  <td className="text-foreground-muted px-3 py-2.5 text-right tabular-nums">{r.pe}</td>
                  <td className="text-foreground-muted px-3 py-2.5 text-right tabular-nums">{r.pp}</td>
                  <td className="text-foreground-muted px-3 py-2.5 text-right tabular-nums">{r.gf}</td>
                  <td className="text-foreground-muted px-3 py-2.5 text-right tabular-nums">{r.gc}</td>
                  <td
                    className={`px-3 py-2.5 text-right tabular-nums ${diff >= 0 ? "text-brand-teal" : "text-brand-purple"}`}
                  >
                    {diff >= 0 ? `+${diff}` : diff}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums">{r.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
