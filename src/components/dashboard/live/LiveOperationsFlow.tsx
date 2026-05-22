"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import type { MyLeaguesMatchRow } from "@/components/dashboard/leagues/my-leagues-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { matchesForLiveSection } from "./LiveMatchList";
import { LiveMatchPickerStep } from "./LiveMatchPickerStep";
import { MatchOperationsWorkspace } from "./MatchOperationsWorkspace";
import type { LiveMatchListItem } from "./match-operations-types";
import { operationsPhaseToWizardStep, type LiveWizardStep } from "./live-wizard-config";
import { LiveWizardProgress } from "./LiveWizardProgress";
import { floatCard } from "../views/dashboard-view-primitives";

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
  const [operationsPhase, setOperationsPhase] = useState<string | null>(null);

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

  useEffect(() => {
    if (wizardStep < 2 || !operationsPhase) return;
    setWizardStep(operationsPhaseToWizardStep(operationsPhase));
  }, [operationsPhase, wizardStep]);

  const handleChangeMatch = () => {
    setWizardStep(1);
    setOperationsPhase(null);
  };

  if (!hasManagedLeagues) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-foreground-muted text-sm">
            Crea una liga y partidos en Fixture para operar encuentros en vivo.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (matchesState.status === "loading") {
    return (
      <div className={`${floatCard} p-8 text-center`}>
        <p className="text-foreground-muted text-sm">Cargando partidos…</p>
      </div>
    );
  }

  if (matchesState.status === "error") {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm">{matchesState.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <LiveWizardProgress
        currentStep={wizardStep}
        onGoToStep={wizardStep > 1 ? handleChangeMatch : undefined}
      />

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
          onPhaseChange={setOperationsPhase}
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
}
