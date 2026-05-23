"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  CircleDot,
  ClipboardCheck,
  Eye,
  Flag,
  ListOrdered,
  Pause,
  Play,
  ShieldAlert,
  SkipForward,
  Target,
  Timer,
  UserPlus,
  Users,
} from "lucide-react";

import { DashboardRightSlideover } from "@/components/dashboard/DashboardRightSlideover";
import { PlayerTechnicalSheetPanel } from "@/components/dashboard/leagues/PlayerTechnicalSheetPanel";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IncidentEventFeed } from "./IncidentEventFeed";
import { LiveCard, LiveInput, LiveSelect } from "./live-form-controls";
import { LiveFormField } from "./live-form-field";
import {
  LiveAlert,
  LiveBirthDateField,
  LiveCardBusyOverlay,
  LiveEmptyRoster,
  LiveMatchHeader,
  LivePanelShell,
  LiveSectionBody,
} from "./live-ui-primitives";
import { validateBirthDateIso } from "@/logic/players/birth-date-validation";
import { matchMinuteFromElapsedSeconds } from "@/logic/match-operations/elapsed-minute";
import { periodEndActionLabel } from "@/logic/match-operations/match-clock-events";
import { expandLineupEntriesWithAutoBench } from "@/logic/match-operations/match-player-state";

import {
  clockElapsedTone,
  clockToneTextClass,
  effectivePeriodLimitSeconds,
  formatClock,
  formatClockAgainstLimit,
  formatLiveClockHeaderLabel,
  isNearPeriodLimit,
  periodDurationCaption,
  resolveMatchDurationConfig,
  secondHalfAddedSecondsFromReport,
} from "./live-clock-duration";
import type { MatchOperationsBundle } from "./match-operations-types";
import { useMatchOperations } from "./use-match-operations";
import { MockBadge } from "../views/dashboard-view-primitives";

const PERIOD_LABELS: Record<string, string> = {
  first_half: "1.er tiempo",
  halftime: "Medio tiempo",
  second_half: "2.º tiempo",
  ended: "Finalizado",
};

function currentPeriodForIncidents(
  clock: MatchOperationsBundle["operations"]["clock"],
): "first_half" | "second_half" {
  if (clock?.period === "second_half") return "second_half";
  return "first_half";
}

function playerInitial(fullName: string): string {
  const first = fullName.trim()[0];
  return first ? first.toLocaleUpperCase("es") : "?";
}

function PlayerAvatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md";
}) {
  const [broken, setBroken] = useState(false);
  const sizeClass = size === "sm" ? "size-8 text-xs" : "size-10 text-sm";
  const url = src?.trim();

  useEffect(() => {
    queueMicrotask(() => setBroken(false));
  }, [url]);

  return (
    <span
      className={`${sizeClass} border-border bg-background-muted relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-bold text-brand-teal`}
      aria-hidden
    >
      {url && !broken ? (
        <img
          src={url}
          alt=""
          className="size-full object-cover object-center"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        playerInitial(name)
      )}
    </span>
  );
}

export function MatchOperationsWorkspace({
  leagueId,
  matchId,
  onPhaseChange,
  onFinished,
  onEditMatch,
}: {
  leagueId: string;
  matchId: string;
  onPhaseChange?: (phase: string) => void;
  onFinished?: () => void;
  onEditMatch?: () => void;
}) {
  const { state, refreshing, post, put, reload } = useMatchOperations(leagueId, matchId);
  const [error, setError] = useState<string | null>(null);
  const [localElapsed, setLocalElapsed] = useState(0);
  const [startBusy, setStartBusy] = useState(false);

  const bundle = state.status === "ready" ? state.bundle : null;

  useEffect(() => {
    if (!bundle?.operations.clock) return;
    const id = window.setTimeout(() => {
      setLocalElapsed(bundle.operations.clock?.elapsedSeconds ?? 0);
    }, 0);
    return () => window.clearTimeout(id);
  }, [bundle?.operations.clock]);

  useEffect(() => {
    if (!bundle?.operations.clock || bundle.operations.clock.isPaused) return;
    const id = window.setInterval(() => {
      setLocalElapsed((e) => e + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [bundle?.operations.clock]);

  useEffect(() => {
    if (bundle?.operations.operationsPhase) {
      onPhaseChange?.(bundle.operations.operationsPhase);
    }
  }, [bundle?.operations.operationsPhase, onPhaseChange]);

  if (state.status === "loading" || state.status === "idle") {
    return (
      <LivePanelShell className="p-8">
        <div className="mx-auto max-w-xs space-y-3" aria-busy="true" aria-label="Cargando partido">
          <div className="bg-background-muted/60 h-3 animate-pulse rounded-full" />
          <div className="bg-background-muted/40 h-16 animate-pulse rounded-brand-lg" />
          <p className="text-foreground-muted text-center text-sm">Cargando partido…</p>
        </div>
      </LivePanelShell>
    );
  }

  if (state.status === "error" || !bundle) {
    return (
      <LiveAlert tone="error">
        <p className="text-sm">{state.status === "error" ? state.message : "Sin datos"}</p>
      </LiveAlert>
    );
  }

  const { match, operations, liveScore } = bundle;
  const clock = operations.clock;
  const periodLabel = clock ? PERIOD_LABELS[clock.period] ?? clock.period : "—";
  const durationConfig = resolveMatchDurationConfig(bundle.report);
  const secondHalfAddedSeconds = secondHalfAddedSecondsFromReport(bundle.report);

  const statusBadge =
    match.status === "live" ? (
      <MockBadge tone="lime">
        <span className="mr-1.5 inline-block size-1.5 rounded-full bg-brand-navy motion-safe:animate-pulse" />
        En vivo
      </MockBadge>
    ) : (
      <MockBadge tone="muted">{match.status}</MockBadge>
    );

  return (
    <div className="space-y-5">
      {refreshing ? (
        <div className="pointer-events-none fixed right-5 top-5 z-[90] rounded-full border border-brand-teal/25 bg-background/90 px-3 py-2 text-xs font-bold text-brand-teal shadow-lg backdrop-blur">
          Actualizando...
        </div>
      ) : null}

      <LiveMatchHeader
        homeName={match.homeTeamName}
        awayName={match.awayTeamName}
        homeScore={liveScore.home}
        awayScore={liveScore.away}
        venueName={match.venueName}
        categoryName={match.categoryName}
        scheduledAt={match.scheduledAt}
        statusBadge={statusBadge}
        clockLabel={
          clock
            ? formatLiveClockHeaderLabel(
                clock.period,
                localElapsed,
                durationConfig,
                secondHalfAddedSeconds,
              )
            : null
        }
      />

      {bundle.dbWarnings.length > 0 ? (
        <LiveAlert tone="warn">
          {bundle.dbWarnings.map((w) => (
            <p key={w} className="text-foreground-muted text-xs leading-relaxed">
              {w}
            </p>
          ))}
        </LiveAlert>
      ) : null}

      {error ? (
        <LiveAlert tone="error">
          <p role="alert">{error}</p>
        </LiveAlert>
      ) : null}

      {operations.operationsPhase === "setup" ? (
        <SetupPanel
          bundle={bundle}
          onEditMatch={onEditMatch}
          onValidate={async (fields) => {
            setError(null);
            const r = await post("validate-setup", fields);
            if (!r.ok) setError(r.error);
          }}
        />
      ) : null}

      {operations.operationsPhase === "lineups" ? (
        <LineupsPanel
          bundle={bundle}
          leagueId={leagueId}
          matchId={matchId}
          onReload={() => void reload()}
          onSave={async (entries) => {
            setError(null);
            const r = await put("lineups", { entries });
            if (!r.ok) setError(r.error);
          }}
        />
      ) : null}

      {operations.operationsPhase === "ready" ? (
        <LiveCard
          className={`relative overflow-hidden border-brand-lime/25 ${startBusy ? "cursor-wait" : ""}`}
        >
          {startBusy ? <LiveCardBusyOverlay label="Iniciando partido…" /> : null}
          <div className="bg-gradient-night px-6 py-10 text-center sm:px-8">
            <p className="text-brand-teal text-xs font-bold uppercase tracking-wider">
              Plantilla validada
            </p>
            <CardDescription className="text-foreground-muted mx-auto mt-2 max-w-sm">
              Todo listo para el pitido inicial.
            </CardDescription>
            <Button
              type="button"
              variant="energy"
              size="lg"
              className="mt-6 cursor-pointer"
              disabled={startBusy}
              onClick={async () => {
                if (startBusy) return;
                setStartBusy(true);
                setError(null);
                try {
                  const r = await post("start");
                  if (!r.ok) setError(r.error);
                } finally {
                  setStartBusy(false);
                }
              }}
            >
              <Play className="size-4" />
              Iniciar partido
            </Button>
          </div>
        </LiveCard>
      ) : null}

      {operations.operationsPhase === "live" && match.status === "live" ? (
        <LivePanel
          bundle={bundle}
          localElapsed={localElapsed}
          onClock={async (payload) => {
            setError(null);
            const r = await post("clock", payload);
            if (!r.ok) setError(r.error);
          }}
          onIncident={async (path, body) => {
            setError(null);
            const r = await post(path, body);
            if (!r.ok) setError(r.error);
            return r;
          }}
          onFinish={async (body) => {
            setError(null);
            const r = await post("finish", body);
            if (!r.ok) setError(r.error);
            else onFinished?.();
          }}
        />
      ) : null}

      {operations.operationsPhase === "closed" ? (
        <LivePanelShell>
          <LiveSectionBody>
            <p className="text-foreground-muted text-sm">Partido cerrado.</p>
          </LiveSectionBody>
        </LivePanelShell>
      ) : null}

      {operations.operationsPhase === "live" ||
      operations.operationsPhase === "closed" ||
      bundle.goals.length > 0 ||
      bundle.cards.length > 0 ||
      bundle.substitutions.length > 0 ||
      bundle.fouls.length > 0 ||
      bundle.penalties.length > 0 ? (
        <IncidentEventFeed bundle={bundle} />
      ) : null}
    </div>
  );
}

function SetupPanel({
  bundle,
  onEditMatch,
  onValidate,
}: {
  bundle: MatchOperationsBundle;
  onEditMatch?: () => void;
  onValidate: (fields: {
    playersOnFieldPerTeam: number;
    firstHalfMinutes: number;
    halftimeBreakMinutes: number;
    secondHalfMinutes: number;
  }) => Promise<void>;
}) {
  const { report } = bundle;
  const [playersOnField, setPlayersOnField] = useState(
    String(report.playersOnFieldPerTeam ?? 11),
  );
  const [fh, setFh] = useState(String(report.firstHalfMinutes ?? 45));
  const [ht, setHt] = useState(String(report.halftimeBreakMinutes ?? 15));
  const [sh, setSh] = useState(String(report.secondHalfMinutes ?? 45));
  const [validateBusy, setValidateBusy] = useState(false);

  const handleValidate = async () => {
    if (validateBusy) return;
    setValidateBusy(true);
    try {
      await onValidate({
        playersOnFieldPerTeam: Number(playersOnField),
        firstHalfMinutes: Number(fh),
        halftimeBreakMinutes: Number(ht),
        secondHalfMinutes: Number(sh),
      });
    } finally {
      setValidateBusy(false);
    }
  };

  return (
    <LiveCard className={`relative ${validateBusy ? "cursor-wait" : ""}`}>
      {validateBusy ? (
        <LiveCardBusyOverlay label="Validando datos del partido…" />
      ) : null}
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="text-brand-teal size-4" aria-hidden />
          Reglas del encuentro
        </CardTitle>
        <CardDescription>
          Estos valores aplican a este partido antes de confirmar la plantilla.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <LiveFormField label="Jugadores en cancha (por equipo)" htmlFor="players-on-field">
            <LiveInput
              id="players-on-field"
              type="number"
              min={1}
              max={30}
              value={playersOnField}
              onChange={(e) => setPlayersOnField(e.target.value)}
            />
          </LiveFormField>
          <LiveFormField label="1.er tiempo (min)" htmlFor="first-half-min">
            <LiveInput
              id="first-half-min"
              type="number"
              min={1}
              max={120}
              value={fh}
              onChange={(e) => setFh(e.target.value)}
            />
          </LiveFormField>
          <LiveFormField label="Descanso (min)" htmlFor="halftime-min">
            <LiveInput
              id="halftime-min"
              type="number"
              min={0}
              max={60}
              value={ht}
              onChange={(e) => setHt(e.target.value)}
            />
          </LiveFormField>
          <LiveFormField label="2.º tiempo (min)" htmlFor="second-half-min">
            <LiveInput
              id="second-half-min"
              type="number"
              min={1}
              max={120}
              value={sh}
              onChange={(e) => setSh(e.target.value)}
            />
          </LiveFormField>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        {onEditMatch ? (
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer shadow-none"
            disabled={validateBusy}
            onClick={onEditMatch}
          >
            Editar datos del encuentro
          </Button>
        ) : null}
        <Button
          type="button"
          variant="default"
          className="cursor-pointer shadow-none"
          disabled={validateBusy}
          onClick={() => void handleValidate()}
        >
          Validar y continuar
        </Button>
      </CardFooter>
    </LiveCard>
  );
}

function LineupsPanel({
  bundle,
  leagueId,
  matchId,
  onReload,
  onSave,
}: {
  bundle: MatchOperationsBundle;
  leagueId: string;
  matchId: string;
  onReload: () => void;
  onSave: (
    entries: Array<{ teamId: string; playerId: string; slot: "starter" | "bench" }>,
  ) => Promise<void>;
}) {
  const max = bundle.report.playersOnFieldPerTeam ?? 11;
  const [expressTeamId, setExpressTeamId] = useState(bundle.match.homeTeamId);
  const [expressName, setExpressName] = useState("");
  const [expressBirth, setExpressBirth] = useState("");
  const [expressBirthError, setExpressBirthError] = useState<string | null>(null);
  const [expressShirt, setExpressShirt] = useState("");
  const [expressBusy, setExpressBusy] = useState(false);
  const [expressError, setExpressError] = useState<string | null>(null);
  const [expressSheetOpen, setExpressSheetOpen] = useState(false);
  const [viewedPlayer, setViewedPlayer] = useState<{
    teamId: string;
    playerId: string;
    playerName: string;
  } | null>(null);

  const handleExpressBirthChange = useCallback((value: string) => {
    setExpressBirth(value);
    setExpressBirthError(value ? validateBirthDateIso(value) : null);
  }, []);
  const [selected, setSelected] = useState<Record<string, "starter" | "bench" | "">>(() => {
    const init: Record<string, "starter" | "bench" | ""> = {};
    for (const l of bundle.lineups) {
      init[`${l.teamId}:${l.playerId}`] = l.slot;
    }
    return init;
  });

  const setPlayerSlot = (teamId: string, playerId: string, slot: "starter" | "bench" | "") => {
    const key = `${teamId}:${playerId}`;
    setSelected((prev) => {
      if (slot === "") {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: slot };
    });
  };

  const teams = [
    { id: bundle.match.homeTeamId, name: bundle.match.homeTeamName },
    { id: bundle.match.awayTeamId, name: bundle.match.awayTeamName },
  ];

  const starterCount = (teamId: string) =>
    Object.entries(selected).filter(
      ([key, slot]) => key.startsWith(`${teamId}:`) && slot === "starter",
    ).length;
  const benchCount = (teamId: string) =>
    Object.entries(selected).filter(
      ([key, slot]) => key.startsWith(`${teamId}:`) && slot === "bench",
    ).length;
  const playerByTeam = (teamId: string) =>
    new Map((bundle.rosterByTeam[teamId] ?? []).map((p) => [p.playerId, p]));
  const starterIds = (teamId: string) =>
    Object.entries(selected)
      .filter(([key, slot]) => key.startsWith(`${teamId}:`) && slot === "starter")
      .map(([key]) => key.split(":")[1]);
  const benchIds = (teamId: string) =>
    Object.entries(selected)
      .filter(([key, slot]) => key.startsWith(`${teamId}:`) && slot === "bench")
      .map(([key]) => key.split(":")[1]);
  const canSave = teams.every((team) => starterCount(team.id) === max);
  const [saveBusy, setSaveBusy] = useState(false);

  const handleSaveLineup = async () => {
    if (saveBusy || !canSave) return;
    setSaveBusy(true);
    try {
      const picked = Object.entries(selected)
        .filter(([, slot]) => slot === "starter" || slot === "bench")
        .map(([key, slot]) => {
          const [teamId, playerId] = key.split(":");
          return { teamId, playerId, slot: slot as "starter" | "bench" };
        });
      const roster = Object.entries(bundle.rosterByTeam).flatMap(([teamId, players]) =>
        players.map((p) => ({ teamId, playerId: p.playerId })),
      );
      await onSave(expandLineupEntriesWithAutoBench(picked, roster));
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <LiveCard className={`relative ${saveBusy ? "cursor-wait" : ""}`}>
      {saveBusy ? <LiveCardBusyOverlay label="Validando plantilla…" /> : null}
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="text-brand-teal size-4" aria-hidden />
              Plantilla
            </CardTitle>
            <CardDescription className="mt-1.5">
              Elige exactamente {max} titulares por equipo. El resto del plantel se registrará
              automáticamente como suplentes.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 self-start shadow-none"
            disabled={saveBusy}
            onClick={() => setExpressSheetOpen(true)}
          >
            <UserPlus className="size-4" aria-hidden />
            Alta al momento
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <DashboardRightSlideover
          open={expressSheetOpen}
          title="Alta al momento"
          description="Agrega un jugador al plantel y queda seleccionado automáticamente."
          size="md"
          preventClose={expressBusy}
          onClose={() => setExpressSheetOpen(false)}
        >
          <div className="space-y-5">
            <CardTitle className="text-brand-teal flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
              <UserPlus className="size-3.5" aria-hidden />
              Jugador express
            </CardTitle>
            <div className="grid gap-4">
              <LiveFormField label="Equipo" htmlFor="express-team">
                <LiveSelect
                  id="express-team"
                  value={expressTeamId}
                  onChange={(e) => setExpressTeamId(e.target.value)}
                >
                  <option value={bundle.match.homeTeamId}>{bundle.match.homeTeamName}</option>
                  <option value={bundle.match.awayTeamId}>{bundle.match.awayTeamName}</option>
                </LiveSelect>
              </LiveFormField>
              <LiveFormField label="Nombre completo" htmlFor="express-name">
                <LiveInput
                  id="express-name"
                  type="text"
                  placeholder="Nombre y apellidos"
                  value={expressName}
                  onChange={(e) => setExpressName(e.target.value)}
                />
              </LiveFormField>
              <LiveBirthDateField
                id="express-birth-date"
                value={expressBirth}
                onChange={handleExpressBirthChange}
                error={expressBirthError}
                disabled={expressBusy}
              />
              <LiveFormField label="Número" htmlFor="express-shirt">
                <LiveInput
                  id="express-shirt"
                  type="number"
                  min={0}
                  max={99}
                  placeholder="—"
                  value={expressShirt}
                  onChange={(e) => setExpressShirt(e.target.value)}
                />
              </LiveFormField>
            </div>
            <div className="border-t border-border pt-4">
              {expressError ? (
                <p className="text-destructive mb-3 text-xs" role="alert">
                  {expressError}
                </p>
              ) : (
                <p className="text-foreground-muted mb-3 text-xs">
                  Si hay cupo, se agrega como titular; si no, queda en banco.
                </p>
              )}
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={expressBusy}
                onClick={() => {
                  setExpressError(null);
                  const birthErr = validateBirthDateIso(expressBirth);
                  if (!expressName.trim()) {
                    setExpressError("Captura el nombre del jugador.");
                    return;
                  }
                  if (birthErr) {
                    setExpressBirthError(birthErr);
                    return;
                  }
                  setExpressBusy(true);
                  void fetch(
                    `/api/leagues/${leagueId}/matches/${matchId}/operations/express-player`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        teamId: expressTeamId,
                        fullName: expressName,
                        birthDate: expressBirth,
                        shirtNumber: expressShirt ? Number(expressShirt) : null,
                      }),
                    },
                  )
                    .then(async (res) => {
                      const data = (await res.json().catch(() => ({}))) as {
                        error?: string;
                        playerId?: string;
                      };
                      if (!res.ok) {
                        setExpressError(data.error ?? "No se pudo crear el jugador.");
                        return;
                      }
                      if (data.playerId) {
                        setPlayerSlot(
                          expressTeamId,
                          data.playerId,
                          starterCount(expressTeamId) < max ? "starter" : "bench",
                        );
                      }
                      setExpressName("");
                      setExpressBirth("");
                      setExpressBirthError(null);
                      setExpressShirt("");
                      setExpressSheetOpen(false);
                      onReload();
                    })
                    .catch(() => setExpressError("Error de red."))
                    .finally(() => setExpressBusy(false));
                }}
              >
                {expressBusy ? "Añadiendo..." : "Añadir al plantel"}
              </Button>
            </div>
          </div>
        </DashboardRightSlideover>

        <div className="grid gap-6 lg:grid-cols-2">
          {teams.map((team) => {
            const roster = bundle.rosterByTeam[team.id] ?? [];
            const starters = starterCount(team.id);
            const bench = benchCount(team.id);
            const rosterMap = playerByTeam(team.id);
            const selectedStarterIds = starterIds(team.id);
            const selectedBenchIds = benchIds(team.id);
            const starterFull = starters >= max;
            const available = roster.filter((p) => {
              const slot = selected[`${team.id}:${p.playerId}`];
              return slot !== "starter" && slot !== "bench";
            });
            return (
              <div
                key={team.id}
                className="border-border rounded-brand-lg border bg-background p-4"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold tracking-tight">{team.name}</p>
                    <p className="text-foreground-muted mt-1 text-xs">
                      {starters === max
                        ? "Titulares completos"
                        : `Faltan ${max - starters} titular${max - starters === 1 ? "" : "es"}`}
                      {bench > 0 ? ` · ${bench} suplente${bench === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      starters > max
                        ? "bg-destructive/15 text-destructive"
                        : starters === max
                          ? "bg-brand-lime/20 text-brand-lime"
                          : "bg-background-muted text-foreground-muted"
                    }`}
                  >
                    {starters}/{max} T
                  </span>
                </div>

                <div className="mb-4 rounded-brand-md border border-brand-teal/20 bg-brand-teal/5 p-3">
                  <p className="text-brand-teal mb-2 text-[10px] font-bold uppercase tracking-wide">
                    Titulares
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: max }, (_, index) => {
                      const playerId = selectedStarterIds[index];
                      const player = playerId ? rosterMap.get(playerId) : null;
                      return (
                        <div
                          key={`${team.id}-starter-${index}`}
                          className={`flex min-h-11 items-center justify-between gap-2 rounded-brand-md border px-3 py-2 text-sm ${
                            player
                              ? "border-brand-lime/35 bg-background"
                              : "border-dashed border-border bg-background/40 text-foreground-muted"
                          }`}
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="text-brand-teal shrink-0 font-mono text-xs font-bold tabular-nums">
                              {index + 1}
                            </span>
                            {player ? (
                              <>
                                {player.shirtNumber != null ? (
                                  <span className="text-brand-teal shrink-0 font-bold tabular-nums">
                                    {player.shirtNumber}
                                  </span>
                                ) : null}
                                <PlayerAvatar
                                  name={player.playerName}
                                  src={player.profileImageUrl}
                                  size="sm"
                                />
                                <span className="min-w-0 truncate">{player.playerName}</span>
                              </>
                            ) : (
                              <span className="text-foreground-muted truncate">Cupo libre</span>
                            )}
                          </span>
                          {player ? (
                            <button
                              type="button"
                              className="text-foreground-muted hover:text-foreground shrink-0 cursor-pointer text-xs font-bold"
                              onClick={() => setPlayerSlot(team.id, player.playerId, "")}
                            >
                              Quitar
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {roster.length === 0 ? (
                  <LiveEmptyRoster />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-foreground-muted mb-2 text-[10px] font-bold uppercase tracking-wide">
                        Jugadores disponibles
                      </p>
                      {available.length === 0 ? (
                        <p className="text-foreground-muted rounded-brand-md border border-dashed border-border px-3 py-4 text-sm">
                          Todos los jugadores disponibles ya están en titulares o suplentes.
                        </p>
                      ) : (
                        <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1 text-sm">
                          {available.map((p) => (
                            <li
                              key={p.playerId}
                              className="border-border hover:border-brand-teal/25 flex items-center justify-between gap-2 rounded-brand-md border bg-background-muted/30 px-3 py-2 transition-colors duration-200"
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <PlayerAvatar name={p.playerName} src={p.profileImageUrl} />
                                <span className="min-w-0 truncate">
                                  {p.shirtNumber != null ? (
                                    <span className="text-brand-teal mr-1.5 font-bold tabular-nums">
                                      {p.shirtNumber}
                                    </span>
                                  ) : null}
                                  {p.playerName}
                                </span>
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 shadow-none"
                                  onClick={() =>
                                    setViewedPlayer({
                                      teamId: team.id,
                                      playerId: p.playerId,
                                      playerName: p.playerName,
                                    })
                                  }
                                  aria-label={`Ver ficha de ${p.playerName}`}
                                >
                                  <Eye className="size-4" aria-hidden />
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 px-2.5 shadow-none"
                                  disabled={starterFull}
                                  onClick={() => setPlayerSlot(team.id, p.playerId, "starter")}
                                >
                                  Titular
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs shadow-none"
                                  onClick={() => setPlayerSlot(team.id, p.playerId, "bench")}
                                >
                                  Banco
                                </Button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {selectedBenchIds.length > 0 ? (
                      <div>
                        <p className="text-foreground-muted mb-2 text-[10px] font-bold uppercase tracking-wide">
                          Suplentes
                        </p>
                        <ul className="flex flex-wrap gap-2">
                          {selectedBenchIds.map((playerId) => {
                            const player = rosterMap.get(playerId);
                            if (!player) return null;
                            return (
                              <li
                                key={playerId}
                                className="border-border flex items-center gap-2 rounded-full border bg-background-muted/40 py-1 pl-3 pr-1 text-xs"
                              >
                                <PlayerAvatar
                                  name={player.playerName}
                                  src={player.profileImageUrl}
                                  size="sm"
                                />
                                <span className="max-w-40 truncate">
                                  {player.shirtNumber != null ? (
                                    <span className="text-brand-teal mr-1 font-bold tabular-nums">
                                      {player.shirtNumber}
                                    </span>
                                  ) : null}
                                  {player.playerName}
                                </span>
                                <button
                                  type="button"
                                  className="hover:bg-background-muted flex size-6 cursor-pointer items-center justify-center rounded-full text-foreground-muted hover:text-foreground"
                                  onClick={() => setPlayerSlot(team.id, playerId, "")}
                                  aria-label={`Quitar ${player.playerName} de suplentes`}
                                >
                                  ×
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      <DashboardRightSlideover
        open={viewedPlayer != null}
        title={viewedPlayer?.playerName ?? "Ficha del jugador"}
        description="Verificación de identidad para el administrador de cancha."
        size="2xl"
        onClose={() => setViewedPlayer(null)}
      >
        {viewedPlayer ? (
          <PlayerTechnicalSheetPanel
            leagueId={bundle.match.leagueId}
            teamId={viewedPlayer.teamId}
            playerId={viewedPlayer.playerId}
            onClose={() => setViewedPlayer(null)}
            readOnly
          />
        ) : null}
      </DashboardRightSlideover>
      <CardFooter className="flex flex-col items-stretch gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-foreground-muted text-xs">
          Para continuar, cada equipo debe tener exactamente {max} titulares.
        </p>
        <Button
          type="button"
          variant="default"
          className="cursor-pointer"
          disabled={!canSave || saveBusy}
          onClick={() => void handleSaveLineup()}
        >
          Validar plantilla y continuar
        </Button>
      </CardFooter>
    </LiveCard>
  );
}

function IncidentActionButton({
  icon,
  label,
  accent = "default",
  selected = false,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  accent?: "default" | "goal";
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex min-h-14 items-center justify-center gap-2 rounded-brand-lg border px-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 ${
        accent === "goal"
          ? "border-brand-lime/45 bg-brand-lime text-brand-navy"
          : selected
            ? "border-brand-teal/50 bg-brand-teal/10 text-foreground ring-2 ring-brand-teal/25"
            : "border-border bg-background-muted/35 text-foreground hover:border-brand-teal/40 hover:bg-background-muted/55"
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function SlideConfirmGoal({
  disabled,
  onConfirm,
}: {
  disabled?: boolean;
  onConfirm: () => Promise<void>;
}) {
  const [value, setValue] = useState("0");
  const [busy, setBusy] = useState(false);
  const locked = disabled || busy;

  return (
    <div
      className={`rounded-brand-lg border px-4 py-3 ${
        locked
          ? "border-border bg-background-muted/20 opacity-55"
          : "border-brand-lime/45 bg-brand-lime/10"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold">
          <span className="text-lg leading-none" aria-hidden>
            ⚽
          </span>
          Gol
        </span>
        <span className="text-foreground-muted text-[10px] font-bold uppercase tracking-wide">
          {busy ? "Registrando..." : "Desliza para registrar"}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={locked}
        aria-label="Deslizar para registrar gol"
        className="accent-brand-lime h-3 w-full cursor-pointer disabled:cursor-not-allowed"
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          if (Number(next) >= 98) {
            setValue("0");
            setBusy(true);
            void onConfirm().finally(() => setBusy(false));
          }
        }}
        onPointerUp={() => setValue("0")}
        onBlur={() => setValue("0")}
      />
    </div>
  );
}

type PenaltyOutcome = "scored" | "saved" | "missed" | "off_target";

const PENALTY_OUTCOMES: { value: PenaltyOutcome; label: string }[] = [
  { value: "scored", label: "Gol" },
  { value: "saved", label: "Parada" },
  { value: "missed", label: "Fallado" },
  { value: "off_target", label: "Fuera" },
];

function penaltySuccessMessage(outcome: PenaltyOutcome): string {
  switch (outcome) {
    case "scored":
      return "Penalti convertido.";
    case "saved":
      return "Penalti parado.";
    case "missed":
      return "Penalti fallado.";
    case "off_target":
      return "Penalti fuera.";
  }
}

function TeamStatRow({
  label,
  home,
  away,
}: {
  label: string;
  home: number;
  away: number;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-brand-md border border-border bg-background-muted/20 px-3 py-2 text-sm">
      <span className="text-right font-bold tabular-nums text-foreground">{home}</span>
      <span className="text-foreground-muted min-w-28 text-center text-[10px] font-bold uppercase tracking-wide">
        {label}
      </span>
      <span className="font-bold tabular-nums text-foreground">{away}</span>
    </div>
  );
}

function MatchStatsPanel({ bundle }: { bundle: MatchOperationsBundle }) {
  const { match } = bundle;
  const countByTeam = <T extends { teamId: string }>(items: T[], teamId: string) =>
    items.filter((item) => item.teamId === teamId).length;
  const countFouls = (teamId: string) =>
    bundle.fouls.filter((item) => item.offendingTeamId === teamId).length;
  const yellowCards = (teamId: string) =>
    bundle.cards.filter(
      (item) =>
        item.teamId === teamId &&
        (item.cardKind === "yellow" || item.cardKind === "second_yellow"),
    ).length;
  const redCards = (teamId: string) =>
    bundle.cards.filter(
      (item) =>
        item.teamId === teamId &&
        (item.cardKind === "red" || item.cardKind === "second_yellow"),
    ).length;

  return (
    <LiveCard>
      <CardHeader className="px-4 py-4 sm:px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListOrdered className="text-brand-teal size-4" aria-hidden />
          Estadísticas del partido
        </CardTitle>
        <CardDescription>Resumen acumulado por equipo durante el encuentro.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 text-xs font-bold uppercase tracking-wide">
          <span className="truncate text-right text-brand-teal">{match.homeTeamName}</span>
          <span className="text-foreground-subtle text-center">vs</span>
          <span className="truncate text-brand-teal">{match.awayTeamName}</span>
        </div>
        <TeamStatRow label="Goles" home={bundle.liveScore.home} away={bundle.liveScore.away} />
        <TeamStatRow
          label="Faltas"
          home={countFouls(match.homeTeamId)}
          away={countFouls(match.awayTeamId)}
        />
        <TeamStatRow
          label="Amarillas"
          home={yellowCards(match.homeTeamId)}
          away={yellowCards(match.awayTeamId)}
        />
        <TeamStatRow
          label="Rojas"
          home={redCards(match.homeTeamId)}
          away={redCards(match.awayTeamId)}
        />
        <TeamStatRow
          label="Cambios"
          home={countByTeam(bundle.substitutions, match.homeTeamId)}
          away={countByTeam(bundle.substitutions, match.awayTeamId)}
        />
        <TeamStatRow
          label="Penaltis"
          home={countByTeam(bundle.penalties, match.homeTeamId)}
          away={countByTeam(bundle.penalties, match.awayTeamId)}
        />
      </CardContent>
    </LiveCard>
  );
}

function LivePanel({
  bundle,
  localElapsed,
  onClock,
  onIncident,
  onFinish,
}: {
  bundle: MatchOperationsBundle;
  localElapsed: number;
  onClock: (payload: {
    action: "pause" | "resume" | "end_period" | "add_stoppage";
    minutes?: number;
  }) => Promise<void>;
  onIncident: (path: string, body: Record<string, unknown>) => Promise<{ ok: boolean }>;
  onFinish: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [teamId, setTeamId] = useState(bundle.match.homeTeamId);
  const [playerId, setPlayerId] = useState("");
  const [cardKind, setCardKind] = useState<"yellow" | "red">("yellow");
  const [penaltyOutcome, setPenaltyOutcome] = useState<PenaltyOutcome>("scored");
  const [penaltyPanelOpen, setPenaltyPanelOpen] = useState(false);
  const [subOut, setSubOut] = useState("");
  const [subIn, setSubIn] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [incidentBusy, setIncidentBusy] = useState(false);
  const [clockBusyAction, setClockBusyAction] = useState<
    "pause" | "resume" | "end_period" | "add_stoppage" | null
  >(null);
  const [customStoppageOpen, setCustomStoppageOpen] = useState(false);
  const [customStoppageMinutes, setCustomStoppageMinutes] = useState("3");
  const period = currentPeriodForIncidents(bundle.operations.clock);
  const incidentMinute = matchMinuteFromElapsedSeconds(localElapsed);
  const durationConfig = resolveMatchDurationConfig(bundle.report);
  const secondHalfAddedSeconds = secondHalfAddedSecondsFromReport(bundle.report);
  const clockPeriod = bundle.operations.clock?.period;
  const periodLimitSeconds = effectivePeriodLimitSeconds(
    clockPeriod,
    durationConfig,
    secondHalfAddedSeconds,
  );
  const clockTone =
    periodLimitSeconds != null
      ? clockElapsedTone(localElapsed, periodLimitSeconds, "seconds")
      : ("normal" as const);
  const periodDurationLabel = periodDurationCaption(
    clockPeriod,
    durationConfig,
    secondHalfAddedSeconds,
  );
  const showStoppageOptions =
    clockPeriod === "second_half" &&
    periodLimitSeconds != null &&
    isNearPeriodLimit(localElapsed, periodLimitSeconds);
  const showLiveControls = clockPeriod !== "ended";

  const roster = bundle.rosterByTeam[teamId] ?? [];
  const onFieldIds =
    teamId === bundle.match.homeTeamId
      ? bundle.onFieldPlayerIds.home
      : bundle.onFieldPlayerIds.away;
  const benchIds =
    teamId === bundle.match.homeTeamId
      ? bundle.benchPlayerIds.home
      : bundle.benchPlayerIds.away;
  const benchLineupById = new Map(
    bundle.lineups
      .filter((l) => l.teamId === teamId && l.slot === "bench")
      .map((l) => [l.playerId, l]),
  );
  const onFieldRoster = onFieldIds
    .map((id) => roster.find((p) => p.playerId === id))
    .filter((p): p is (typeof roster)[number] => Boolean(p));
  const selectedYellowCount = playerId
    ? bundle.cards.filter(
        (c) => c.teamId === teamId && c.playerId === playerId && c.cardKind === "yellow",
      ).length
    : 0;

  const clearIncidentFields = () => {
    setPlayerId("");
    setSubOut("");
    setSubIn("");
    setCardKind("yellow");
    setPenaltyOutcome("scored");
    setPenaltyPanelOpen(false);
  };

  const runIncident = async (
    path: string,
    body: Record<string, unknown>,
    success = "Evento registrado con éxito.",
  ) => {
    if (incidentBusy) return { ok: false };
    setIncidentBusy(true);
    try {
      const result = await onIncident(path, body);
      if (result.ok) {
        clearIncidentFields();
        setSuccessMessage(success);
        window.setTimeout(() => setSuccessMessage(null), 2600);
      }
      return result;
    } finally {
      setIncidentBusy(false);
    }
  };
  const runClock = async (payload: {
    action: "pause" | "resume" | "end_period" | "add_stoppage";
    minutes?: number;
  }) => {
    if (clockBusyAction) return;
    setClockBusyAction(payload.action);
    try {
      await onClock(payload);
      if (payload.action === "add_stoppage") {
        setCustomStoppageOpen(false);
      }
    } finally {
      setClockBusyAction(null);
    }
  };
  const clockBusyLabel =
    clockBusyAction === "pause"
      ? "Pausando reloj..."
      : clockBusyAction === "resume"
        ? "Reanudando reloj..."
        : clockBusyAction === "end_period"
          ? "Finalizando periodo..."
          : clockBusyAction === "add_stoppage"
            ? "Añadiendo tiempo extra..."
            : null;

  return (
    <div className="space-y-4">
      {showLiveControls ? (
      <LiveCard
        className={`sticky top-[57px] z-10 sm:static ${clockBusyAction ? "cursor-wait" : ""}`}
      >
        {clockBusyLabel ? <LiveCardBusyOverlay label={clockBusyLabel} /> : null}
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="bg-brand-teal/10 text-brand-teal flex size-9 shrink-0 items-center justify-center rounded-full">
              <Timer className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">Reloj</p>
              <p className="text-foreground-muted text-xs">
                {bundle.operations.clock?.isPaused ? "Pausado" : "En marcha"}
                {periodDurationLabel ? (
                  <span className="text-foreground-subtle"> · {periodDurationLabel}</span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-3xl font-black tabular-nums transition-colors duration-300 ${clockToneTextClass(clockTone)}`}
              aria-live="polite"
            >
              {periodLimitSeconds != null
                ? formatClockAgainstLimit(
                    localElapsed,
                    Math.ceil(periodLimitSeconds / 60),
                  )
                : formatClock(localElapsed)}
            </span>
            {clockTone !== "normal" ? (
              <p
                className={`mt-0.5 text-[10px] font-bold uppercase tracking-wide ${clockToneTextClass(clockTone)}`}
              >
                {clockTone === "over" ? "Tiempo cumplido" : "Cerca del límite"}
              </p>
            ) : null}
          </div>
        </div>
        {secondHalfAddedSeconds > 0 ? (
          <div className="flex w-full justify-center border-t border-border px-3 py-2">
            <p className="text-foreground-muted text-center text-xs">
              +{Math.round(secondHalfAddedSeconds / 60)} min de tiempo extra añadidos
            </p>
          </div>
        ) : null}
        {showStoppageOptions ? (
          <div className="space-y-2 border-t border-border px-3 pb-3 pt-2">
            <p className="text-brand-teal text-center text-xs font-semibold">
              Añadir tiempo extra al 2.º tiempo
            </p>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 5] as const).map((min) => (
                <Button
                  key={min}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-10 shadow-none"
                  disabled={Boolean(clockBusyAction)}
                  onClick={() =>
                    void runClock({ action: "add_stoppage", minutes: min })
                  }
                >
                  +{min} min
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-10 shadow-none ${customStoppageOpen ? "border-brand-teal bg-brand-teal/10 text-brand-teal" : ""}`}
                disabled={Boolean(clockBusyAction)}
                onClick={() => setCustomStoppageOpen((o) => !o)}
              >
                Otro
              </Button>
            </div>
            {customStoppageOpen ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={customStoppageMinutes}
                  onChange={(e) => setCustomStoppageMinutes(e.target.value)}
                  className="border-border bg-background-muted/40 h-10 min-w-0 flex-1 rounded-brand-md border px-3 text-sm tabular-nums"
                  aria-label="Minutos de tiempo extra personalizados"
                />
                <Button
                  type="button"
                  variant="default"
                  className="h-10 shrink-0 shadow-none"
                  disabled={Boolean(clockBusyAction)}
                  onClick={() => {
                    const n = Number.parseInt(customStoppageMinutes, 10);
                    if (!Number.isInteger(n) || n < 1 || n > 30) return;
                    void runClock({ action: "add_stoppage", minutes: n });
                  }}
                >
                  Añadir
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
          <Button
            type="button"
            variant="secondary"
            className="h-11 shadow-none"
            disabled={Boolean(clockBusyAction)}
            onClick={() =>
              void runClock({
                action: bundle.operations.clock?.isPaused ? "resume" : "pause",
              })
            }
          >
            {bundle.operations.clock?.isPaused ? (
              <Play className="size-4" />
            ) : (
              <Pause className="size-4" />
            )}
            {bundle.operations.clock?.isPaused ? "Reanudar" : "Pausar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 shadow-none"
            disabled={Boolean(clockBusyAction)}
            onClick={() => void runClock({ action: "end_period" })}
          >
            <SkipForward className="size-4" />
            {periodEndActionLabel(bundle.operations.clock?.period)}
          </Button>
        </div>
      </LiveCard>
      ) : null}

      {showLiveControls ? (
      <LiveCard className={incidentBusy ? "cursor-wait" : undefined}>
        <CardHeader className="px-4 py-4 sm:px-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="text-brand-teal size-4" aria-hidden />
            Registrar incidencia
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
          {incidentBusy ? (
            <LiveCardBusyOverlay label="Registrando evento…" rounded="bottom" />
          ) : null}

          {successMessage ? (
            <div
              className="rounded-brand-md border border-brand-lime/30 bg-brand-lime/10 px-3 py-2 text-sm font-semibold text-brand-lime"
              role="status"
            >
              {successMessage}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_8rem]">
            <LiveFormField label="Equipo" htmlFor="incident-team">
              <LiveSelect
                id="incident-team"
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setPlayerId("");
                  setSubOut("");
                  setSubIn("");
                  setPenaltyPanelOpen(false);
                }}
              >
                <option value={bundle.match.homeTeamId}>{bundle.match.homeTeamName}</option>
                <option value={bundle.match.awayTeamId}>{bundle.match.awayTeamName}</option>
              </LiveSelect>
            </LiveFormField>
            <LiveFormField label="Jugador" htmlFor="incident-player">
              <LiveSelect
                id="incident-player"
                value={playerId}
                onChange={(e) => {
                  setPlayerId(e.target.value);
                  setPenaltyPanelOpen(false);
                }}
              >
                <option value="">Selecciona jugador...</option>
                {onFieldRoster.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {p.playerName}
                  </option>
                ))}
              </LiveSelect>
            </LiveFormField>
            <div className="rounded-brand-md border border-border bg-background-muted/25 px-3 py-2">
              <p className="text-foreground-muted text-[10px] font-bold uppercase tracking-wide">
                Minuto
              </p>
              <p className="text-brand-lime mt-1 text-lg font-black tabular-nums">
                {incidentMinute}&prime;
              </p>
            </div>
          </div>

          <div className="grid gap-2 lg:grid-cols-[minmax(14rem,1.15fr)_repeat(4,minmax(0,1fr))]">
            <SlideConfirmGoal
              disabled={!playerId || incidentBusy}
              onConfirm={async () => {
                setPenaltyPanelOpen(false);
                await runIncident(
                  "goals",
                  {
                    teamId,
                    scorerPlayerId: playerId,
                    period,
                    minute: incidentMinute,
                  },
                  "Gol registrado con éxito.",
                );
              }}
            />
            <IncidentActionButton
              icon={<ShieldAlert className="size-4" />}
              label={
                cardKind === "red"
                  ? "Roja"
                  : selectedYellowCount > 0
                    ? "2ª amarilla"
                    : "Amarilla"
              }
              disabled={!playerId || incidentBusy}
              onClick={() => {
                setPenaltyPanelOpen(false);
                void runIncident(
                  "cards",
                  {
                    teamId,
                    playerId,
                    cardKind,
                    period,
                    minute: incidentMinute,
                  },
                  "Tarjeta registrada con éxito.",
                );
              }}
            />
            <IncidentActionButton
              icon={<Users className="size-4" />}
              label="Cambio"
              disabled={!subOut || !subIn || incidentBusy}
              onClick={() => {
                setPenaltyPanelOpen(false);
                void runIncident(
                  "substitutions",
                  {
                    teamId,
                    playerOutId: subOut,
                    playerInId: subIn,
                    period,
                    minute: incidentMinute,
                  },
                  "Cambio registrado con éxito.",
                );
              }}
            />
            <IncidentActionButton
              icon={<Flag className="size-4" />}
              label="Falta"
              disabled={!playerId || incidentBusy}
              onClick={() => {
                setPenaltyPanelOpen(false);
                void runIncident(
                  "fouls",
                  {
                    offendingTeamId: teamId,
                    offendingPlayerId: playerId,
                    period,
                    minute: incidentMinute,
                  },
                  "Falta registrada con éxito.",
                );
              }}
            />
            <IncidentActionButton
              icon={<CircleDot className="size-4" />}
              label="Penalti"
              selected={penaltyPanelOpen}
              disabled={!playerId || incidentBusy}
              onClick={() => setPenaltyPanelOpen((open) => !open)}
            />
          </div>

          {penaltyPanelOpen ? (
            <div className="flex flex-wrap items-center gap-2 rounded-brand-lg border border-brand-teal/25 bg-brand-teal/5 p-3">
              <span className="text-foreground-muted w-full text-xs font-bold uppercase tracking-wide sm:w-auto">
                Resultado del penalti
              </span>
              {PENALTY_OUTCOMES.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={penaltyOutcome === value ? "secondary" : "ghost"}
                  size="sm"
                  className="shadow-none"
                  disabled={incidentBusy}
                  onClick={() => setPenaltyOutcome(value)}
                >
                  {label}
                </Button>
              ))}
              <Button
                type="button"
                variant="default"
                size="sm"
                className="ml-auto shadow-none"
                disabled={!playerId || incidentBusy}
                onClick={() =>
                  void runIncident(
                    "penalties",
                    {
                      teamId,
                      takerId: playerId,
                      outcome: penaltyOutcome,
                      period,
                      minute: incidentMinute,
                    },
                    penaltySuccessMessage(penaltyOutcome),
                  )
                }
              >
                Registrar penalti
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-foreground-muted text-xs font-bold uppercase tracking-wide">
              Tipo de tarjeta
            </span>
            <Button
              type="button"
              variant={cardKind === "yellow" ? "secondary" : "ghost"}
              size="sm"
              className="shadow-none"
              disabled={incidentBusy}
              onClick={() => setCardKind("yellow")}
            >
              {selectedYellowCount > 0 ? "2ª amarilla (expulsa)" : "Amarilla"}
            </Button>
            <Button
              type="button"
              variant={cardKind === "red" ? "destructive" : "ghost"}
              size="sm"
              className="shadow-none"
              disabled={incidentBusy}
              onClick={() => setCardKind("red")}
            >
              Roja
            </Button>
          </div>

          <div className="rounded-brand-lg border border-border bg-background-muted/20 p-3">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-foreground-muted">
              Cambio de jugadores
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <LiveFormField label="Sale" htmlFor="sub-out">
                <LiveSelect
                  id="sub-out"
                  value={subOut}
                  onChange={(e) => setSubOut(e.target.value)}
                >
                  <option value="">En cancha…</option>
                  {onFieldIds.map((id) => {
                    const p = roster.find((r) => r.playerId === id);
                    return (
                      <option key={id} value={id}>
                        {p?.playerName ?? id}
                      </option>
                    );
                  })}
                </LiveSelect>
              </LiveFormField>
              <LiveFormField label="Entra" htmlFor="sub-in">
                <LiveSelect
                  id="sub-in"
                  value={subIn}
                  onChange={(e) => setSubIn(e.target.value)}
                >
                  <option value="">Suplente…</option>
                  {benchIds.map((id) => {
                    const lineup = benchLineupById.get(id);
                    const p = roster.find((r) => r.playerId === id);
                    return (
                      <option key={id} value={id}>
                        {lineup?.playerName ?? p?.playerName ?? id}
                      </option>
                    );
                  })}
                </LiveSelect>
              </LiveFormField>
            </div>
          </div>
        </CardContent>
      </LiveCard>
      ) : null}

      {bundle.foulCounts.home >= 5 || bundle.foulCounts.away >= 5 ? (
        <LiveAlert tone="warn">
          <p className="font-medium">5 faltas acumuladas</p>
          <p className="text-foreground-muted mt-1 text-xs">
            Recomendación: registrar tiro libre directo para el equipo que alcanzó el límite.
          </p>
        </LiveAlert>
      ) : null}

      <MatchStatsPanel bundle={bundle} />

      <FinishPanel bundle={bundle} onFinish={onFinish} />
    </div>
  );
}

type NoShowFinishMode = "walkover_away" | "walkover_home" | "both_no_show";

function FinishPanel({
  bundle,
  onFinish,
}: {
  bundle: MatchOperationsBundle;
  onFinish: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [home, setHome] = useState(String(bundle.liveScore.home));
  const [away, setAway] = useState(String(bundle.liveScore.away));
  const [notes, setNotes] = useState("");
  const [noShowMode, setNoShowMode] = useState<NoShowFinishMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);

  const resetFinishForm = () => {
    setHome(String(bundle.liveScore.home));
    setAway(String(bundle.liveScore.away));
    setNotes("");
    setNoShowMode(null);
  };

  const runFinish = (body: Record<string, unknown>) => {
    setBusy(true);
    void onFinish(body).finally(() => {
      setBusy(false);
      setFinishOpen(false);
      resetFinishForm();
    });
  };

  const confirmFinish = () => {
    if (noShowMode) {
      runFinish({ type: noShowMode, notes: notes || null });
      return;
    }
    runFinish({
      type: "played",
      homeScore: Number(home),
      awayScore: Number(away),
      notes: notes || null,
    });
  };

  const noShowButtonClass = (mode: NoShowFinishMode) =>
    `min-h-11 justify-center whitespace-normal px-3 text-xs shadow-none ${
      noShowMode === mode
        ? "border-brand-teal/50 bg-brand-teal/10 text-foreground ring-2 ring-brand-teal/25"
        : ""
    }`;

  const { homeTeamName, awayTeamName } = bundle.match;

  return (
    <LiveCard>
      <CardHeader className="px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="text-brand-teal size-4" aria-hidden />
              Cerrar partido
            </CardTitle>
            <CardDescription className="mt-1">
              Marcador registrado: {bundle.liveScore.home}–{bundle.liveScore.away}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="default"
            className="h-11 w-full shadow-none sm:w-auto"
            onClick={() => {
              resetFinishForm();
              setFinishOpen(true);
            }}
          >
            Cerrar partido
          </Button>
        </div>
      </CardHeader>

      <DashboardRightSlideover
        open={finishOpen}
        title="Cerrar partido"
        description={
          noShowMode
            ? undefined
            : `Marcador registrado: ${bundle.liveScore.home}–${bundle.liveScore.away}`
        }
        size="lg"
        preventClose={busy}
        onClose={() => {
          if (busy) return;
          setFinishOpen(false);
          resetFinishForm();
        }}
      >
        <div className="space-y-5">
          <div className="rounded-brand-lg border border-brand-purple/25 bg-brand-purple/5 p-3">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand-purple">
              No presentación
            </p>
            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                className={noShowButtonClass("walkover_away")}
                disabled={busy}
                onClick={() =>
                  setNoShowMode((prev) => (prev === "walkover_away" ? null : "walkover_away"))
                }
              >
                No se presenta {awayTeamName} (3 pts - 0 pts)
              </Button>
              <Button
                type="button"
                variant="outline"
                className={noShowButtonClass("walkover_home")}
                disabled={busy}
                onClick={() =>
                  setNoShowMode((prev) => (prev === "walkover_home" ? null : "walkover_home"))
                }
              >
                No se presenta {homeTeamName} (3 pts - 0 pts)
              </Button>
              <Button
                type="button"
                variant="outline"
                className={noShowButtonClass("both_no_show")}
                disabled={busy}
                onClick={() =>
                  setNoShowMode((prev) => (prev === "both_no_show" ? null : "both_no_show"))
                }
              >
                Ambos ausentes (0 pts)
              </Button>
            </div>
          </div>

          {noShowMode ? (
            <LiveFormField label="Notas" htmlFor="finish-notes">
              <LiveInput
                id="finish-notes"
                type="text"
                placeholder="Discrepancia u observaciones"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </LiveFormField>
          ) : (
            <div className="grid items-end gap-3 sm:grid-cols-[6rem_6rem_minmax(0,1fr)]">
              <LiveFormField label={homeTeamName} htmlFor="finish-home">
                <LiveInput
                  id="finish-home"
                  type="number"
                  min={0}
                  value={home}
                  onChange={(e) => setHome(e.target.value)}
                  className="text-center font-semibold tabular-nums"
                />
              </LiveFormField>
              <LiveFormField label={awayTeamName} htmlFor="finish-away">
                <LiveInput
                  id="finish-away"
                  type="number"
                  min={0}
                  value={away}
                  onChange={(e) => setAway(e.target.value)}
                  className="text-center font-semibold tabular-nums"
                />
              </LiveFormField>
              <LiveFormField label="Notas" htmlFor="finish-notes">
                <LiveInput
                  id="finish-notes"
                  type="text"
                  placeholder="Discrepancia u observaciones"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </LiveFormField>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <Button
              type="button"
              variant="default"
              className="h-12 w-full shadow-none"
              disabled={busy}
              onClick={confirmFinish}
            >
              Finalizar partido
            </Button>
          </div>
        </div>
      </DashboardRightSlideover>
    </LiveCard>
  );
}
