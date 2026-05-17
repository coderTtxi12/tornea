"use client";

import type { MyLeaguesPlayerRow, MyLeaguesTeamRow } from "@/components/dashboard/leagues/my-leagues-state";
import { floatCard } from "@/components/dashboard/views/dashboard-view-primitives";

function formatRegisteredAtShort(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function positionLabel(p: MyLeaguesPlayerRow): string {
  const raw = p.position?.trim();
  return raw && raw.length > 0 ? raw : "Sin asignar";
}

type TeamRosterPanelProps = {
  team: MyLeaguesTeamRow;
  roster: readonly MyLeaguesPlayerRow[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onViewPlayerSheet: (args: { leagueId: string; teamId: string; playerId: string }) => void;
};

export function TeamRosterPanel({
  team,
  roster,
  loading,
  error,
  onClose,
  onViewPlayerSheet,
}: TeamRosterPanelProps) {
  return (
    <section
      className={`${floatCard} mt-6 overflow-hidden`}
      aria-labelledby="team-roster-panel-heading"
    >
      <header className="border-border flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 id="team-roster-panel-heading" className="text-sm font-bold tracking-tight">
            Plantilla y fichas · {team.name}
          </h3>
          <p className="text-foreground-muted mt-0.5 text-xs leading-snug">
            {team.leagueName}
            {team.categoryName ? ` · ${team.categoryName}` : ""} · temporada objetivo ·{" "}
            <code className="text-foreground-muted">team_rosters</code>
          </p>
        </div>
        <button
          type="button"
          className="text-foreground-muted hover:text-foreground shrink-0 text-xs font-semibold underline-offset-4 hover:underline"
          onClick={onClose}
        >
          Cerrar
        </button>
      </header>

      {loading ? (
        <p className="text-foreground-muted px-4 py-8 text-center text-sm sm:px-5">Cargando plantilla…</p>
      ) : error ? (
        <p className="text-brand-purple px-4 py-6 text-sm sm:px-5">{error}</p>
      ) : roster.length === 0 ? (
        <p className="text-foreground-muted px-4 py-8 text-center text-sm sm:px-5">
          Este equipo no tiene jugadores en la plantilla de la temporada actual.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="text-foreground-muted border-border border-b text-[11px] font-bold tracking-wide uppercase">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Jugador</th>
                <th className="px-4 py-3">Posición</th>
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {roster.map((p) => (
                <tr key={p.id} className="hover:bg-surface-code/15">
                  <td className="text-foreground-muted px-4 py-2.5 tabular-nums">
                    {p.shirtNumber ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{p.fullName}</td>
                  <td className="text-foreground-muted px-4 py-2.5">{positionLabel(p)}</td>
                  <td className="text-foreground-muted px-4 py-2.5 whitespace-nowrap tabular-nums">
                    {formatRegisteredAtShort(p.registeredAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      className="text-foreground-muted hover:text-foreground text-xs font-semibold underline-offset-4 hover:underline"
                      onClick={() =>
                        onViewPlayerSheet({
                          leagueId: p.leagueId,
                          teamId: p.teamId,
                          playerId: p.playerId,
                        })
                      }
                    >
                      Ver ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
