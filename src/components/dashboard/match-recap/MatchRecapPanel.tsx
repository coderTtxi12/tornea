"use client";

import type { ReactNode } from "react";
import { Calendar, Clock, Flag, User } from "lucide-react";

import {
  buildIncidentFeedItems,
  IncidentFeedList,
} from "@/components/dashboard/live/IncidentEventFeed";
import { LiveMatchHeader } from "@/components/dashboard/live/live-ui-primitives";
import type { MatchOperationsBundle } from "@/components/dashboard/live/match-operations-types";
import type { MyLeaguesMatchRow } from "@/components/dashboard/leagues/my-leagues-state";
import { MockBadge } from "@/components/dashboard/views/dashboard-view-primitives";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { countLineupStarters } from "./match-recap-chart-data";
import { MatchRecapCharts } from "./MatchRecapCharts";

function recapStatusLabel(status: string): string {
  if (status === "finished") return "Terminado";
  if (status === "walkover") return "Walkover";
  return status;
}

function formatPhase(row: MyLeaguesMatchRow, bundle: MatchOperationsBundle): string {
  const parts: string[] = [];
  if (bundle.match.matchday != null) parts.push(`J${bundle.match.matchday}`);
  const label = bundle.match.roundLabel?.trim() || row.roundLabel?.trim();
  if (label) parts.push(label);
  return parts.length ? parts.join(" · ") : "—";
}

function formatIsoLocal(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return "—";
  }
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-brand-md border border-border/60 bg-background-muted/25 px-3 py-2.5">
      <span className="text-brand-teal mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-foreground-subtle text-[10px] font-semibold uppercase tracking-wide">
          {label}
        </p>
        <p className="text-foreground truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function MatchRecapPanel({
  row,
  bundle,
}: {
  row: MyLeaguesMatchRow;
  bundle: MatchOperationsBundle;
}) {
  const { match } = bundle;
  const incidents = buildIncidentFeedItems(bundle);
  const statusBadge = (
    <MockBadge tone={match.status === "walkover" ? "warn" : "blue"}>
      {recapStatusLabel(match.status)}
    </MockBadge>
  );

  const homeStarters = countLineupStarters(bundle, match.homeTeamId);
  const awayStarters = countLineupStarters(bundle, match.awayTeamId);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-16">
      <LiveMatchHeader
        homeName={match.homeTeamName}
        awayName={match.awayTeamName}
        homeScore={bundle.liveScore.home}
        awayScore={bundle.liveScore.away}
        venueName={match.venueName ?? row.venueName}
        categoryName={match.categoryName ?? row.categoryName}
        scheduledAt={match.scheduledAt}
        statusBadge={statusBadge}
        clockLabel={
          match.startedAt && match.endedAt
            ? `${formatIsoLocal(match.startedAt)} → ${formatIsoLocal(match.endedAt)}`
            : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaItem icon={<Flag className="size-4" />} label="Liga" value={row.leagueName} />
        <MetaItem icon={<Calendar className="size-4" />} label="Temporada" value={row.seasonName} />
        <MetaItem
          icon={<Clock className="size-4" />}
          label="Fase"
          value={formatPhase(row, bundle)}
        />
        <MetaItem
          icon={<User className="size-4" />}
          label="Árbitro"
          value={match.refereeName ?? row.leagueRefereeFullName ?? "—"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-border text-foreground-muted">
          Titulares: {match.homeTeamName} {homeStarters || "—"}
        </Badge>
        <Badge variant="outline" className="border-border text-foreground-muted">
          Titulares: {match.awayTeamName} {awayStarters || "—"}
        </Badge>
        {bundle.report.playersOnFieldPerTeam != null ? (
          <Badge variant="outline" className="border-border text-foreground-muted">
            En cancha: {bundle.report.playersOnFieldPerTeam}
          </Badge>
        ) : null}
        {bundle.substitutions.length > 0 ? (
          <Badge variant="outline" className="border-border text-foreground-muted">
            Cambios: {bundle.substitutions.length}
          </Badge>
        ) : null}
      </div>

      {match.status === "walkover" ? (
        <Card className="border-brand-purple/30 bg-brand-purple/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Walkover</CardTitle>
            <CardDescription>
              Resultado administrativo; el marcador refleja la resolución registrada en el sistema.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {row.notes?.trim() ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground-muted text-sm leading-relaxed">{row.notes.trim()}</p>
          </CardContent>
        </Card>
      ) : null}

      {bundle.dbWarnings.length > 0 ? (
        <Card className="border-brand-purple/25">
          <CardContent className="pt-6">
            {bundle.dbWarnings.map((w) => (
              <p key={w} className="text-foreground-muted text-xs leading-relaxed">
                {w}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Separator />

      <MatchRecapCharts bundle={bundle} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cronología</CardTitle>
          <CardDescription>
            Goles, tarjetas, cambios y faltas ordenados por registro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IncidentFeedList
            items={incidents}
            className="max-h-[28rem] space-y-3 overflow-y-auto pr-1"
            emptyMessage="No hay incidencias registradas para este partido."
          />
        </CardContent>
      </Card>
    </div>
  );
}
