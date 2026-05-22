"use client";

import {
  ArrowLeftRight,
  CircleDot,
  Flag,
  ListOrdered,
  ShieldAlert,
  Timer,
} from "lucide-react";

import type { MatchOperationsBundle } from "./match-operations-types";
import { LivePanelShell, LiveSectionBody, LiveSectionHeader } from "./live-ui-primitives";
import { MockBadge } from "../views/dashboard-view-primitives";

type FeedItem = {
  id: string;
  kind: string;
  minute: number | null;
  label: string;
  detail?: string;
  teamLabel: string;
  createdAt: string;
};

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

function teamLabelForId(bundle: MatchOperationsBundle, teamId: string): string {
  if (teamId === bundle.match.homeTeamId) return `${bundle.match.homeTeamName} · Local`;
  if (teamId === bundle.match.awayTeamId) return `${bundle.match.awayTeamName} · Visitante`;
  return "Equipo";
}

export function buildIncidentFeedItems(bundle: MatchOperationsBundle): FeedItem[] {
  const items: FeedItem[] = [];

  for (const g of bundle.goals) {
    items.push({
      id: g.id,
      kind: "goal",
      minute: g.minute,
      label: g.isOwnGoal ? "Autogol" : "Gol",
      detail: [g.scorerName, g.assistName ? `asist. ${g.assistName}` : null]
        .filter(Boolean)
        .join(" · "),
      teamLabel: teamLabelForId(bundle, g.teamId),
      createdAt: g.createdAt,
    });
  }
  for (const c of bundle.cards) {
    items.push({
      id: c.id,
      kind: "card",
      minute: c.minute,
      label:
        c.cardKind === "red"
          ? "Roja"
          : c.cardKind === "second_yellow"
            ? "2.ª amarilla"
            : "Amarilla",
      detail: c.playerName ?? undefined,
      teamLabel: teamLabelForId(bundle, c.teamId),
      createdAt: c.createdAt,
    });
  }
  for (const s of bundle.substitutions) {
    items.push({
      id: s.id,
      kind: "sub",
      minute: s.minute,
      label: "Cambio",
      detail: `${s.playerOutName} → ${s.playerInName}`,
      teamLabel: teamLabelForId(bundle, s.teamId),
      createdAt: s.createdAt,
    });
  }
  for (const f of bundle.fouls) {
    items.push({
      id: f.id,
      kind: "foul",
      minute: f.minute,
      label: "Falta",
      detail: f.offendingPlayerName ?? undefined,
      teamLabel: teamLabelForId(bundle, f.offendingTeamId),
      createdAt: f.createdAt,
    });
  }
  for (const e of bundle.matchEvents) {
    items.push({
      id: e.id,
      kind: "clock",
      minute: e.minute,
      label: e.label,
      teamLabel: "Partido",
      createdAt: e.createdAt,
    });
  }
  for (const p of bundle.penalties) {
    const outcomeLabel =
      p.outcome === "scored"
        ? "gol"
        : p.outcome === "saved"
          ? "parada"
          : p.outcome === "missed"
            ? "fallado"
            : p.outcome === "off_target"
              ? "fuera"
              : p.outcome;
    items.push({
      id: p.id,
      kind: "penalty",
      minute: p.minute,
      label: "Penalti",
      detail: `${p.takerName ?? "—"} · ${outcomeLabel}`,
      teamLabel: teamLabelForId(bundle, p.teamId),
      createdAt: p.createdAt,
    });
  }

  return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

const ICONS = {
  card: ShieldAlert,
  sub: ArrowLeftRight,
  foul: Flag,
  penalty: CircleDot,
  clock: Timer,
} as const;

const ICON_TONES: Record<string, string> = {
  goal: "bg-brand-lime/15 text-brand-lime",
  card: "bg-brand-purple/15 text-brand-purple",
  sub: "bg-brand-teal/15 text-brand-teal",
  foul: "bg-background-muted text-foreground-muted",
  penalty: "bg-brand-blue/15 text-brand-blue",
  clock: "bg-brand-teal/15 text-brand-teal",
};

export function IncidentEventFeed({ bundle }: { bundle: MatchOperationsBundle }) {
  const items = buildIncidentFeedItems(bundle);

  return (
    <LivePanelShell>
      <LiveSectionHeader
        icon={<ListOrdered className="size-4" />}
        title="Eventos del partido"
        description={
          items.length > 0
            ? `${items.length} incidencia${items.length === 1 ? "" : "s"} registrada${items.length === 1 ? "" : "s"}`
            : "Cronología de goles, tarjetas, cambios y periodos."
        }
      />
      <LiveSectionBody>
        {items.length === 0 ? (
          <p className="text-foreground-muted text-sm">Sin incidencias registradas.</p>
        ) : (
          <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {items.map((item) => {
              const Icon = ICONS[item.kind as keyof typeof ICONS] ?? CircleDot;
              const tone = ICON_TONES[item.kind] ?? ICON_TONES.foul;
              const isGoal = item.kind === "goal";
              return (
                <li
                  key={item.id}
                  className="border-border flex min-h-[4.5rem] cursor-default items-center gap-4 rounded-brand-lg border bg-background-muted/20 px-4 py-4 text-sm transition-colors duration-200"
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tone}`}
                  >
                    {isGoal ? (
                      <span className="text-base leading-none" aria-hidden>
                        ⚽
                      </span>
                    ) : (
                      <Icon className="size-4" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold">{item.label}</span>
                    <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-brand-teal truncate text-xs font-semibold">
                        {item.teamLabel}
                      </span>
                      {item.detail ? (
                        <span className="text-foreground-muted truncate text-xs">
                          {item.detail}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-foreground-subtle mt-0.5 text-[10px] font-medium">
                      {formatEventTime(item.createdAt)}
                    </p>
                  </div>
                  {item.minute != null ? (
                    <MockBadge tone="lime">{item.minute}′</MockBadge>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </LiveSectionBody>
    </LivePanelShell>
  );
}
