"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import type { MyLeaguesMatchRow } from "@/components/dashboard/leagues/my-leagues-state";
import { useMatchOperations } from "@/components/dashboard/live/use-match-operations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { MatchRecapPanel } from "./MatchRecapPanel";

export function MatchRecapFullscreen({
  row,
  onClose,
}: {
  row: MyLeaguesMatchRow;
  onClose: () => void;
}) {
  const { state } = useMatchOperations(row.leagueId, row.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-background"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-recap-title"
    >
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-3 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 id="match-recap-title" className="truncate text-lg font-semibold tracking-tight">
              Resumen del partido
            </h1>
            <p className="text-foreground-muted truncate text-sm">
              {row.homeTeamName} vs {row.awayTeamName}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
            aria-label="Cerrar resumen"
          >
            <X className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="px-3 py-5 sm:px-6 lg:px-8">
        {state.status === "loading" || state.status === "idle" ? (
          <Card className="mx-auto max-w-lg">
            <CardContent className="py-12 text-center" aria-busy="true">
              <p className="text-foreground-muted text-sm">Cargando detalle del partido…</p>
            </CardContent>
          </Card>
        ) : state.status === "error" ? (
          <Card className="mx-auto max-w-lg border-brand-purple/30">
            <CardContent className="py-8 text-center">
              <p className="text-sm">{state.message}</p>
              <Button type="button" variant="outline" className="mt-4" onClick={onClose}>
                Cerrar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <MatchRecapPanel row={row} bundle={state.bundle} />
        )}
      </div>
    </div>
  );
}
