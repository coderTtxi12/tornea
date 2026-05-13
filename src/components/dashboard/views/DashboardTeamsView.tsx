"use client";

import type { MyLeaguesTeamRow } from "../leagues/my-leagues-state";
import {
  DashboardViewHeader,
  floatCard,
  MockActionButton,
  MockBadge,
} from "./dashboard-view-primitives";

function statusLabel(status: MyLeaguesTeamRow["status"]): string {
  if (status === "active") return "Activo";
  if (status === "inactive") return "Inactivo";
  return "Retirado";
}

function badgeCode(t: MyLeaguesTeamRow): string {
  if (t.shortName?.trim()) return t.shortName.trim().toUpperCase();
  return t.name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 4) || "—";
}

export function DashboardTeamsView({
  teamRows,
  onOpenRegisterTeamDrawer,
  onOpenEditTeamDrawer,
}: {
  teamRows: readonly MyLeaguesTeamRow[];
  onOpenRegisterTeamDrawer: () => void;
  onOpenEditTeamDrawer: (args: { leagueId: string; teamId: string }) => void;
}) {
  const rows = [...teamRows].sort(
    (a, b) =>
      a.leagueName.localeCompare(b.leagueName, "es") || a.name.localeCompare(b.name, "es"),
  );

  return (
    <>
      <DashboardViewHeader
        title="Equipos"
        hint="Todos los clubes de tus ligas. Datos desde `teams` y categoría / plantilla por temporada en `season_teams`."
        actions={
          <>
            <MockActionButton variant="secondary">Importar CSV</MockActionButton>
            <button
              type="button"
              onClick={onOpenRegisterTeamDrawer}
              className="cursor-pointer rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95"
            >
              Registrar equipo
            </button>
          </>
        }
      />
      {rows.length === 0 ? (
        <p className="text-foreground-muted text-sm">
          Todavía no hay equipos registrados. Usá &quot;Registrar equipo&quot; para agregar el primero.
        </p>
      ) : (
        <div className={`${floatCard} overflow-x-auto`}>
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead>
              <tr className="text-foreground-muted border-border border-b text-[11px] font-bold tracking-wide uppercase">
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3">Liga</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Jugadores</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((t) => (
                <tr
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  className="hover:bg-surface-code/20 cursor-pointer transition-colors"
                  onClick={() => onOpenEditTeamDrawer({ leagueId: t.leagueId, teamId: t.id })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenEditTeamDrawer({ leagueId: t.leagueId, teamId: t.id });
                    }
                  }}
                >
                  <td className="px-4 py-2.5 font-medium">{t.name}</td>
                  <td className="text-foreground-muted px-4 py-2.5">{t.leagueName}</td>
                  <td className="text-foreground-muted px-4 py-2.5">
                    {t.categoryName ?? "—"}
                  </td>
                  <td className="text-foreground-muted px-4 py-2.5 tabular-nums">
                    {t.playersCount}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        t.status === "active"
                          ? "border-border bg-surface-code/50 rounded-md border px-2 py-0.5 text-xs font-semibold"
                          : "border-border text-foreground-muted rounded-md border border-dashed px-2 py-0.5 text-xs font-semibold"
                      }
                    >
                      {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <MockBadge tone={t.status === "active" ? "lime" : "muted"}>
                      {badgeCode(t)}
                    </MockBadge>
                  </td>
                  <td
                    className="px-4 py-2.5 text-right"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <MockActionButton variant="ghost" className="!p-0 !text-xs">
                      Plantilla y fichas
                    </MockActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
