"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";

import type { MyLeaguesMatchRow } from "@/components/dashboard/leagues/my-leagues-state";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

import { matchesForLiveSection } from "./LiveMatchList";
import { LiveCard } from "./live-form-controls";
import { LIVE_PANEL_CLASS } from "./live-field-styles";
import { LiveMatchPickerStep } from "./LiveMatchPickerStep";
import { LiveNowOverview } from "./LiveNowOverview";
import { MatchOperationsWorkspace } from "./MatchOperationsWorkspace";
import type { LiveMatchListItem } from "./match-operations-types";
import {
  operationsPhaseToWizardStep,
  setLiveCourtFullscreenOpen,
  type LiveWizardStep,
} from "./live-wizard-config";
import { LiveWizardProgress } from "./LiveWizardProgress";

type MatchesLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: MyLeaguesMatchRow[] };

export function LiveOperationsFlow({
  hasManagedLeagues,
  onOpenEditMatchDrawer,
}: {
  hasManagedLeagues: boolean;
  onOpenEditMatchDrawer?: (row: MyLeaguesMatchRow) => void;
}) {
  const [matchesState, setMatchesState] = useState<MatchesLoadState>({ status: "idle" });
  const [selected, setSelected] = useState<LiveMatchListItem | null>(null);
  const [wizardStep, setWizardStep] = useState<LiveWizardStep>(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  useEffect(() => {
    setLiveCourtFullscreenOpen(fullscreenOpen);
    return () => setLiveCourtFullscreenOpen(false);
  }, [fullscreenOpen]);

  useEffect(() => {
    if (!hasManagedLeagues) return;

    let cancelled = false;
    void (async () => {
      setMatchesState({ status: "loading" });
      try {
        const res = await fetch("/api/leagues/my/matches", { method: "GET" });
        if (cancelled) return;
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        if (!res.ok) {
          setMatchesState({
            status: "error",
            message: "No se pudieron cargar los partidos.",
          });
          return;
        }
        const data = (await res.json()) as { matches?: MyLeaguesMatchRow[] };
        setMatchesState({ status: "ready", rows: data.matches ?? [] });
      } catch {
        if (!cancelled) {
          setMatchesState({ status: "error", message: "Error de red." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasManagedLeagues, refreshKey]);

  const liveMatches = useMemo(() => {
    if (matchesState.status !== "ready") return [];
    return matchesForLiveSection(matchesState.rows);
  }, [matchesState]);

  const handleChangeMatch = () => {
    setWizardStep(1);
  };

  const handleCloseFullscreen = () => {
    const shouldClose = window.confirm(
      "¿Estás seguro que deseas cerrar cancha en vivo? Los cambios no guardados podrían perderse.",
    );
    if (shouldClose) setFullscreenOpen(false);
  };

  if (!hasManagedLeagues) {
    return (
      <LiveCard className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-foreground-muted text-sm">
            Crea una liga y partidos en Fixture para operar encuentros en vivo.
          </p>
        </CardContent>
      </LiveCard>
    );
  }

  if (matchesState.status === "loading") {
    return (
      <div className={`rounded-brand-xl border p-8 text-center ${LIVE_PANEL_CLASS}`}>
        <p className="text-foreground-muted text-sm">Cargando partidos…</p>
      </div>
    );
  }

  if (matchesState.status === "error") {
    return (
      <LiveCard>
        <CardContent className="pt-6">
          <p className="text-sm">{matchesState.message}</p>
        </CardContent>
      </LiveCard>
    );
  }

  const workspace = (
    <div className="mx-auto max-w-5xl space-y-4 pb-20 sm:space-y-5">
      <div className="sticky top-0 z-20 -mx-3 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:border-b-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-2xl">
            Cancha · En vivo
          </h1>
          <p className="text-foreground-muted mt-0.5 hidden text-sm sm:block">
            Sigue los pasos: elige partido, valida datos, confirma plantilla y opera en vivo.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={handleCloseFullscreen}
          aria-label="Cerrar cancha en vivo"
        >
          <X className="size-5" aria-hidden />
        </Button>
      </div>

      <div className="hidden sm:block">
        <LiveWizardProgress
          currentStep={wizardStep}
          onGoToStep={wizardStep > 1 ? handleChangeMatch : undefined}
        />
      </div>

      {wizardStep > 1 && selected ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="cursor-pointer -mt-2 px-0 text-brand-teal hover:text-brand-teal"
          onClick={handleChangeMatch}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Cambiar partido
        </Button>
      ) : null}

      {wizardStep === 1 ? (
        <LiveMatchPickerStep
          matches={liveMatches}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          onContinue={() => {
            if (!selected) return;
            setWizardStep(2);
          }}
        />
      ) : selected ? (
        <MatchOperationsWorkspace
          key={`${selected.id}-${refreshKey}`}
          leagueId={selected.leagueId}
          matchId={selected.id}
          onPhaseChange={(phase) => setWizardStep(operationsPhaseToWizardStep(phase))}
          onFinished={() => setRefreshKey((k) => k + 1)}
          onEditMatch={
            onOpenEditMatchDrawer
              ? () => {
                  if (matchesState.status !== "ready") return;
                  const row = matchesState.rows.find((m) => m.id === selected.id);
                  if (row) onOpenEditMatchDrawer(row);
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );

  return (
    <>
      <LiveNowOverview matches={liveMatches} onStartLive={() => setFullscreenOpen(true)} />

      {fullscreenOpen ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-background px-3 py-0 sm:px-6 sm:py-6 lg:px-8">
          {workspace}
        </div>
      ) : null}
    </>
  );
}
