"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CircleDot,
  ClipboardCheck,
  Flag,
  Pause,
  Play,
  ShieldAlert,
  SkipForward,
  Target,
  Timer,
  UserPlus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { IncidentEventFeed } from "./IncidentEventFeed";
import { LiveFormField } from "./live-form-field";
import {
  LiveAlert,
  LiveBirthDateField,
  LiveEmptyRoster,
  LiveMatchHeader,
  LivePanelShell,
  LiveSectionBody,
  LiveSectionHeader,
  SlotToggleGroup,
} from "./live-ui-primitives";
import { validateBirthDateIso } from "@/logic/players/birth-date-validation";
import type { MatchOperationsBundle } from "./match-operations-types";
import { useMatchOperations } from "./use-match-operations";
import { MockBadge } from "../views/dashboard-view-primitives";

const PERIOD_LABELS: Record<string, string> = {
  first_half: "1.er tiempo",
  halftime: "Medio tiempo",
  second_half: "2.º tiempo",
  ended: "Finalizado",
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function currentPeriodForIncidents(
  clock: MatchOperationsBundle["operations"]["clock"],
): "first_half" | "second_half" {
  if (clock?.period === "second_half") return "second_half";
  return "first_half";
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
  const { state, post, put, reload } = useMatchOperations(leagueId, matchId);
  const [error, setError] = useState<string | null>(null);
  const [localElapsed, setLocalElapsed] = useState(0);

  const bundle = state.status === "ready" ? state.bundle : null;

  useEffect(() => {
    if (!bundle?.operations.clock) return;
    setLocalElapsed(bundle.operations.clock.elapsedSeconds);
  }, [bundle?.operations.clock?.elapsedSeconds, bundle?.operations.clock?.period]);

  useEffect(() => {
    if (!bundle?.operations.clock || bundle.operations.clock.isPaused) return;
    const id = window.setInterval(() => {
      setLocalElapsed((e) => e + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [bundle?.operations.clock?.isPaused, bundle?.operations.clock?.period]);

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
      <LiveMatchHeader
        homeName={match.homeTeamName}
        awayName={match.awayTeamName}
        homeScore={liveScore.home}
        awayScore={liveScore.away}
        venueName={match.venueName}
        categoryName={match.categoryName}
        scheduledAt={match.scheduledAt}
        statusBadge={statusBadge}
        clockLabel={clock ? `${periodLabel} · ${formatClock(localElapsed)}` : null}
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
        <Card className="overflow-hidden border-brand-lime/25">
          <div className="bg-gradient-night px-6 py-10 text-center sm:px-8">
            <p className="text-brand-teal text-xs font-bold uppercase tracking-wider">
              Plantilla validada
            </p>
            <CardDescription className="text-foreground-muted mx-auto mt-2 max-w-sm">
              Todo listo para el pitido inicial. Al iniciar pasarás al paso En vivo.
            </CardDescription>
            <Button
              type="button"
              variant="energy"
              size="lg"
              className="mt-6 cursor-pointer"
              onClick={async () => {
                setError(null);
                const r = await post("start");
                if (!r.ok) setError(r.error);
              }}
            >
              <Play className="size-4" />
              Iniciar partido
            </Button>
          </div>
        </Card>
      ) : null}

      {operations.operationsPhase === "live" && match.status === "live" ? (
        <LivePanel
          bundle={bundle}
          localElapsed={localElapsed}
          onClock={async (action) => {
            setError(null);
            const r = await post("clock", { action });
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

      {(bundle.foulCounts.home >= 5 || bundle.foulCounts.away >= 5) &&
      operations.operationsPhase === "live" ? (
        <LiveAlert tone="warn">
          <p className="font-medium">5 faltas acumuladas</p>
          <p className="text-foreground-muted mt-1 text-xs">
            Recomendación: registrar tiro libre directo para el equipo que alcanzó el límite.
          </p>
        </LiveAlert>
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

  return (
    <Card className="shadow-none">
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
            <Input
              id="players-on-field"
              type="number"
              min={1}
              max={30}
              value={playersOnField}
              onChange={(e) => setPlayersOnField(e.target.value)}
            />
          </LiveFormField>
          <LiveFormField label="1.er tiempo (min)" htmlFor="first-half-min">
            <Input
              id="first-half-min"
              type="number"
              min={1}
              max={120}
              value={fh}
              onChange={(e) => setFh(e.target.value)}
            />
          </LiveFormField>
          <LiveFormField label="Descanso (min)" htmlFor="halftime-min">
            <Input
              id="halftime-min"
              type="number"
              min={0}
              max={60}
              value={ht}
              onChange={(e) => setHt(e.target.value)}
            />
          </LiveFormField>
          <LiveFormField label="2.º tiempo (min)" htmlFor="second-half-min">
            <Input
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
          <Button type="button" variant="outline" className="cursor-pointer shadow-none" onClick={onEditMatch}>
            Editar datos del encuentro
          </Button>
        ) : null}
        <Button
          type="button"
          variant="default"
          className="cursor-pointer shadow-none"
          onClick={() =>
            void onValidate({
              playersOnFieldPerTeam: Number(playersOnField),
              firstHalfMinutes: Number(fh),
              halftimeBreakMinutes: Number(ht),
              secondHalfMinutes: Number(sh),
            })
          }
        >
          Validar y continuar
        </Button>
      </CardFooter>
    </Card>
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

  const toggle = (teamId: string, playerId: string, slot: "starter" | "bench") => {
    const key = `${teamId}:${playerId}`;
    setSelected((prev) => ({
      ...prev,
      [key]: prev[key] === slot ? "" : slot,
    }));
  };

  const teams = [
    { id: bundle.match.homeTeamId, name: bundle.match.homeTeamName },
    { id: bundle.match.awayTeamId, name: bundle.match.awayTeamName },
  ];

  const starterCount = (teamId: string) =>
    Object.entries(selected).filter(
      ([key, slot]) => key.startsWith(`${teamId}:`) && slot === "starter",
    ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="text-brand-teal size-4" aria-hidden />
          Plantilla
        </CardTitle>
        <CardDescription>
          Máximo {max} titulares por equipo. Marca titular (T) o suplente (S).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Card className="border-brand-teal/20 bg-brand-teal/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-brand-teal flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
              <UserPlus className="size-3.5" aria-hidden />
              Alta al momento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <LiveFormField label="Equipo" htmlFor="express-team">
                <Select
                  id="express-team"
                  value={expressTeamId}
                  onChange={(e) => setExpressTeamId(e.target.value)}
                >
                  <option value={bundle.match.homeTeamId}>{bundle.match.homeTeamName}</option>
                  <option value={bundle.match.awayTeamId}>{bundle.match.awayTeamName}</option>
                </Select>
              </LiveFormField>
              <LiveFormField label="Nombre completo" htmlFor="express-name" className="sm:col-span-2">
                <Input
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
                <Input
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="cursor-pointer"
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
                  setExpressName("");
                  setExpressBirth("");
                  setExpressBirthError(null);
                  setExpressShirt("");
                  onReload();
                })
                .catch(() => setExpressError("Error de red."))
                .finally(() => setExpressBusy(false));
            }}
          >
              Añadir al plantel
            </Button>
            {expressError ? (
              <p className="text-destructive text-xs" role="alert">
                {expressError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {teams.map((team) => {
            const roster = bundle.rosterByTeam[team.id] ?? [];
            const starters = starterCount(team.id);
            return (
              <div
                key={team.id}
                className="border-border rounded-brand-lg border bg-surface-card/40 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="font-semibold tracking-tight">{team.name}</p>
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
                {roster.length === 0 ? (
                  <LiveEmptyRoster />
                ) : (
                  <ul className="max-h-56 space-y-1.5 overflow-y-auto text-sm">
                    {roster.map((p) => {
                      const key = `${team.id}:${p.playerId}`;
                      const slot = selected[key];
                      return (
                        <li
                          key={p.playerId}
                          className="border-border hover:border-brand-teal/25 flex items-center justify-between gap-2 rounded-brand-md border bg-background-muted/30 px-3 py-2 transition-colors duration-200"
                        >
                          <span className="min-w-0 truncate">
                            {p.shirtNumber != null ? (
                              <span className="text-brand-teal mr-1.5 font-bold tabular-nums">
                                {p.shirtNumber}
                              </span>
                            ) : null}
                            {p.playerName}
                          </span>
                          <SlotToggleGroup
                            starterActive={slot === "starter"}
                            benchActive={slot === "bench"}
                            onStarter={() => toggle(team.id, p.playerId, "starter")}
                            onBench={() => toggle(team.id, p.playerId, "bench")}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="border-t border-border">
        <Button
          type="button"
          variant="default"
          className="cursor-pointer"
          onClick={() => {
            const entries = Object.entries(selected)
              .filter(([, slot]) => slot === "starter" || slot === "bench")
              .map(([key, slot]) => {
                const [teamId, playerId] = key.split(":");
                return { teamId, playerId, slot: slot as "starter" | "bench" };
              });
            void onSave(entries);
          }}
        >
          Validar plantilla y continuar
        </Button>
      </CardFooter>
    </Card>
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
  onClock: (action: "pause" | "resume" | "end_period") => Promise<void>;
  onIncident: (path: string, body: Record<string, unknown>) => Promise<{ ok: boolean }>;
  onFinish: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [minute, setMinute] = useState("0");
  const [teamId, setTeamId] = useState(bundle.match.homeTeamId);
  const [playerId, setPlayerId] = useState("");
  const [subOut, setSubOut] = useState("");
  const [subIn, setSubIn] = useState("");
  const period = currentPeriodForIncidents(bundle.operations.clock);

  const roster = bundle.rosterByTeam[teamId] ?? [];
  const onFieldIds =
    teamId === bundle.match.homeTeamId
      ? bundle.onFieldPlayerIds.home
      : bundle.onFieldPlayerIds.away;
  const benchIds = bundle.lineups
    .filter((l) => l.teamId === teamId && l.slot === "bench")
    .map((l) => l.playerId);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="text-brand-teal size-4" aria-hidden />
              Reloj
            </CardTitle>
            <CardDescription>Control del tiempo y periodos</CardDescription>
          </div>
          <span className="text-brand-lime text-2xl font-black tabular-nums">
            {formatClock(localElapsed)}
          </span>
        </CardHeader>
        <CardFooter className="flex flex-wrap justify-center gap-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="cursor-pointer"
              onClick={() =>
                void onClock(bundle.operations.clock?.isPaused ? "resume" : "pause")
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
              size="sm"
              className="cursor-pointer"
              onClick={() => void onClock("end_period")}
            >
              <SkipForward className="size-4" />
              Fin de periodo
            </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="text-brand-teal size-4" aria-hidden />
            Registrar incidencia
          </CardTitle>
          <CardDescription>Equipo, minuto, jugador y tipo de evento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <LiveFormField label="Equipo" htmlFor="incident-team">
              <Select
                id="incident-team"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              >
                <option value={bundle.match.homeTeamId}>{bundle.match.homeTeamName}</option>
                <option value={bundle.match.awayTeamId}>{bundle.match.awayTeamName}</option>
              </Select>
            </LiveFormField>
            <LiveFormField label="Minuto" htmlFor="incident-minute">
              <div className="flex items-center gap-1">
                <Input
                  id="incident-minute"
                  type="number"
                  min={0}
                  max={120}
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  className="tabular-nums"
                />
                <span className="text-foreground-muted text-sm">′</span>
              </div>
            </LiveFormField>
            <LiveFormField label="Jugador" htmlFor="incident-player" className="sm:col-span-2">
              <Select
                id="incident-player"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {roster.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {p.playerName}
                  </option>
                ))}
              </Select>
            </LiveFormField>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="cursor-pointer"
            onClick={() =>
              void onIncident("goals", {
                teamId,
                scorerPlayerId: playerId || null,
                period,
                minute: Number(minute),
              })
            }
          >
            <Target className="size-4" />
            Gol
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="cursor-pointer"
            onClick={() =>
              playerId &&
              void onIncident("cards", {
                teamId,
                playerId,
                cardKind: "yellow",
                period,
                minute: Number(minute),
              })
            }
          >
            <ShieldAlert className="size-4" />
            Tarjeta
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="cursor-pointer"
            onClick={() =>
              subOut &&
              subIn &&
              void onIncident("substitutions", {
                teamId,
                playerOutId: subOut,
                playerInId: subIn,
                period,
                minute: Number(minute),
              })
            }
          >
            <Users className="size-4" />
            Cambio
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="cursor-pointer"
            onClick={() =>
              playerId &&
              void onIncident("fouls", {
                offendingTeamId: teamId,
                offendingPlayerId: playerId,
                period,
                minute: Number(minute),
              })
            }
          >
            <Flag className="size-4" />
            Falta
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="cursor-pointer"
            onClick={() =>
              playerId &&
              void onIncident("penalties", {
                teamId,
                takerId: playerId,
                outcome: "scored",
                period,
                minute: Number(minute),
              })
            }
          >
            <CircleDot className="size-4" />
            Penalti
          </Button>
          </div>

          <Card className="bg-background-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wide">
                Cambio de jugadores
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
              <LiveFormField label="Sale" htmlFor="sub-out">
                <Select id="sub-out" value={subOut} onChange={(e) => setSubOut(e.target.value)}>
                  <option value="">En cancha…</option>
                  {onFieldIds.map((id) => {
                    const p = roster.find((r) => r.playerId === id);
                    return (
                      <option key={id} value={id}>
                        {p?.playerName ?? id}
                      </option>
                    );
                  })}
                </Select>
              </LiveFormField>
              <LiveFormField label="Entra" htmlFor="sub-in">
                <Select id="sub-in" value={subIn} onChange={(e) => setSubIn(e.target.value)}>
                  <option value="">Suplente…</option>
                  {benchIds.map((id) => {
                    const p = roster.find((r) => r.playerId === id);
                    return (
                      <option key={id} value={id}>
                        {p?.playerName ?? id}
                      </option>
                    );
                  })}
                </Select>
              </LiveFormField>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <FinishPanel bundle={bundle} onFinish={onFinish} />
    </div>
  );
}

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
  const [busy, setBusy] = useState(false);

  const runFinish = (body: Record<string, unknown>) => {
    setBusy(true);
    void onFinish(body).finally(() => setBusy(false));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Flag className="text-brand-teal size-4" aria-hidden />
          Cerrar partido
        </CardTitle>
        <CardDescription>
          Marcador por goles: {bundle.liveScore.home}–{bundle.liveScore.away}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Card className="border-brand-purple/25 bg-brand-purple/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-brand-purple text-xs font-bold uppercase tracking-wide">
              No presentación (walkover)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={busy}
            onClick={() =>
              runFinish({ type: "walkover_away", notes: notes || null })
            }
          >
            No se presenta visitante (3–0 local)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={busy}
            onClick={() =>
              runFinish({ type: "walkover_home", notes: notes || null })
            }
          >
            No se presenta local (3–0 visitante)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={busy}
            onClick={() => runFinish({ type: "both_no_show", notes: notes || null })}
          >
            Ambos ausentes (0 pts)
          </Button>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-end gap-3">
          <LiveFormField label="Local" htmlFor="finish-home">
            <Input
              id="finish-home"
              type="number"
              min={0}
              value={home}
              onChange={(e) => setHome(e.target.value)}
              className="w-24"
            />
          </LiveFormField>
          <LiveFormField label="Visitante" htmlFor="finish-away">
            <Input
              id="finish-away"
              type="number"
              min={0}
              value={away}
              onChange={(e) => setAway(e.target.value)}
              className="w-24"
            />
          </LiveFormField>
          <LiveFormField label="Notas" htmlFor="finish-notes" className="min-w-[12rem] flex-1">
            <Input
              id="finish-notes"
              type="text"
              placeholder="Discrepancia u observaciones"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </LiveFormField>
        </div>
      </CardContent>
      <CardFooter className="border-t border-border">
        <Button
          type="button"
          variant="default"
          className="cursor-pointer"
          disabled={busy}
          onClick={() =>
            runFinish({
              type: "played",
              homeScore: Number(home),
              awayScore: Number(away),
              notes: notes || null,
            })
          }
        >
          Finalizar con marcador
        </Button>
      </CardFooter>
    </Card>
  );
}
