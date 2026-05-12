"use client";

import { MOCK_PLAYER_ROWS } from "../dashboard-mock-data";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
} from "./dashboard-view-primitives";

export function DashboardPlayersView() {
  return (
    <>
      <DashboardViewHeader
        title="Plantillas y jugadores"
        hint="Alineaciones, camisetas y datos de `players` — validar roster por `season_teams`."
        actions={
          <>
            <MockActionButton variant="secondary">Buscar</MockActionButton>
            <MockActionButton variant="primary">Fichar jugador</MockActionButton>
          </>
        }
      />
      <div className={`${floatCard} overflow-x-auto`}>
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="text-foreground-muted border-border border-b text-[11px] font-bold tracking-wide uppercase">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Jugador</th>
              <th className="px-4 py-3">Club</th>
              <th className="px-4 py-3">Pos.</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {MOCK_PLAYER_ROWS.map((p) => (
              <tr key={p.id} className="hover:bg-surface-code/20">
                <td className="text-foreground-muted px-4 py-2.5 tabular-nums">{p.number}</td>
                <td className="px-4 py-2.5 font-medium">{p.name}</td>
                <td className="text-foreground-muted px-4 py-2.5">{p.teamShort}</td>
                <td className="px-4 py-2.5">
                  <span className="border-border bg-surface-code/50 rounded-md border px-2 py-0.5 text-xs font-semibold">
                    {p.position}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <MockActionButton variant="ghost" className="!p-0 !text-xs">
                    Ver ficha
                  </MockActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
