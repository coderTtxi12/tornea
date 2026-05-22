"use client";

import type { MyLeaguesMatchRow } from "@/components/dashboard/leagues/my-leagues-state";
import { LiveOperationsFlow } from "@/components/dashboard/live/LiveOperationsFlow";

import { DashboardViewHeader } from "./dashboard-view-primitives";

export function DashboardLiveView({
  hasManagedLeagues,
  onOpenEditMatchDrawer,
}: {
  hasManagedLeagues: boolean;
  onOpenEditMatchDrawer?: (row: MyLeaguesMatchRow) => void;
}) {
  return (
    <>
      <DashboardViewHeader
        title="Cancha · En vivo"
        hint="Sigue los pasos: elige partido, valida datos, confirma plantilla y opera en vivo."
      />

      <LiveOperationsFlow
        hasManagedLeagues={hasManagedLeagues}
        onOpenEditMatchDrawer={onOpenEditMatchDrawer}
      />
    </>
  );
}
