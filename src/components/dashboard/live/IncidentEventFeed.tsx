"use client";

import {
  ArrowLeftRight,
  CircleDot,
  Flag,
  ListOrdered,
  ShieldAlert,
  Target,
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
};

function buildFeed(bundle: MatchOperationsBundle): FeedItem[] {
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
    });
  }
  for (const s of bundle.substitutions) {
    items.push({
      id: s.id,
      kind: "sub",
      minute: s.minute,
      label: "Cambio",
      detail: `${s.playerOutName} → ${s.playerInName}`,
    });
  }
  for (const f of bundle.fouls) {
    items.push({
      id: f.id,
      kind: "foul",
      minute: f.minute,
      label: "Falta",
      detail: f.offendingPlayerName ?? undefined,
    });
  }
  for (const p of bundle.penalties) {
    items.push({
      id: p.id,
      kind: "penalty",
      minute: p.minute,
      label: "Penalti",
      detail: `${p.takerName ?? "—"} (${p.outcome})`,
    });
  }

  return items.sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0));
}

const ICONS = {
  goal: Target,
  card: ShieldAlert,
  sub: ArrowLeftRight,
  foul: Flag,
  penalty: CircleDot,
} as const;

const ICON_TONES: Record<string, string> = {
  goal: "bg-brand-lime/15 text-brand-lime",
  card: "bg-brand-purple/15 text-brand-purple",
  sub: "bg-brand-teal/15 text-brand-teal",
  foul: "bg-background-muted text-foreground-muted",
  penalty: "bg-brand-blue/15 text-brand-blue",
};

export function IncidentEventFeed({ bundle }: { bundle: MatchOperationsBundle }) {
  const items = buildFeed(bundle);

  return (
    <LivePanelShell>
      <LiveSectionHeader
        icon={<ListOrdered className="size-4" />}
        title="Eventos del partido"
        description={
          items.length > 0
            ? `${items.length} incidencia${items.length === 1 ? "" : "s"} registrada${items.length === 1 ? "" : "s"}`
            : "Cronología de goles, tarjetas y cambios."
        }
      />
      <LiveSectionBody>
        {items.length === 0 ? (
          <p className="text-foreground-muted text-sm">Sin incidencias registradas.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {items.map((item) => {
              const Icon = ICONS[item.kind as keyof typeof ICONS] ?? CircleDot;
              const tone = ICON_TONES[item.kind] ?? ICON_TONES.foul;
              return (
                <li
                  key={item.id}
                  className="border-border flex cursor-default items-start gap-3 rounded-brand-md border bg-background-muted/25 px-3 py-2.5 text-sm transition-colors duration-200"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-brand-md ${tone}`}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{item.label}</span>
                    {item.detail ? (
                      <p className="text-foreground-muted truncate text-xs">{item.detail}</p>
                    ) : null}
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
