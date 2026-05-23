"use client";

import { useEffect, useMemo, useState } from "react";

import { isMatchEditable } from "@/logic/matches/match-is-editable";

import { newMatchJsonSchema } from "./new-match-form-schema";
import type {
  MyLeaguesApiItem,
  MyLeaguesMatchRow,
  MyLeaguesRefereeRow,
  MyLeaguesVenueRow,
} from "./my-leagues-state";

type SeasonTeamRow = {
  id: string;
  name: string;
  shortName: string | null;
  leagueCategoryId: string | null;
};

type NewMatchFormProps = {
  leagues: readonly MyLeaguesApiItem[];
  venues: readonly MyLeaguesVenueRow[];
  referees: readonly MyLeaguesRefereeRow[];
  onClose: () => void;
  onMatchCreated?: () => void;
  onBusyChange?: (busy: boolean) => void;
  /** Partido a editar; si se pasa, el envío usa PATCH y la liga no se puede cambiar. */
  editRow?: MyLeaguesMatchRow | null;
};

const MATCH_ROUND_PRESET_CUSTOM = "__custom__";

const MATCH_ROUND_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "", label: "Sin etiqueta" },
  { value: "Fase regular / Liga", label: "Fase regular / Liga" },
  { value: "Octavos de final", label: "Octavos de final" },
  { value: "Cuartos de final", label: "Cuartos de final" },
  { value: "Semifinal", label: "Semifinal" },
  { value: "Final", label: "Final" },
  { value: "Tercer lugar", label: "Tercer lugar" },
  { value: MATCH_ROUND_PRESET_CUSTOM, label: "Otro (personalizado)" },
];

function defaultSeasonIdForLeague(L: MyLeaguesApiItem | null): string {
  if (!L?.seasons.length) return "";
  const ids = L.seasons.map((s) => s.id);
  if (L.primarySeasonId && ids.includes(L.primarySeasonId)) {
    return L.primarySeasonId;
  }
  return L.seasons[0]?.id ?? "";
}

function hour12To24(hour12: number, meridiem: "AM" | "PM"): number {
  if (meridiem === "AM") {
    return hour12 === 12 ? 0 : hour12;
  }
  return hour12 === 12 ? 12 : hour12 + 12;
}

/** Interpreta fecha + hora local (sin UTC) y devuelve ISO en UTC. */
function localDatePartsToIso(
  dateStr: string,
  hour12: number,
  minute: number,
  meridiem: "AM" | "PM",
): string | null {
  if (!dateStr.trim()) return null;
  const h24 = hour12To24(hour12, meridiem);
  const d = new Date(
    `${dateStr}T${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
  );
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Misma convención que al crear: fecha/hora local del navegador. */
function isoToBrowserLocalDateTime(iso: string): {
  dateStr: string;
  hour12: number;
  minute: number;
  meridiem: "AM" | "PM";
} | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const dateStr = `${y}-${mo}-${da}`;
  const h24 = d.getHours();
  const minute = d.getMinutes();
  const meridiem: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { dateStr, hour12, minute, meridiem };
}

function parseOptionalPositiveInt(raw: string): number | null | "invalid" {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1) return "invalid";
  return n;
}

function parseRequiredDurationMinutes(
  raw: string,
  opts: { min: number; max: number },
): number | "empty" | "invalid" {
  const t = raw.trim();
  if (!t) return "empty";
  const n = Number(t);
  if (!Number.isInteger(n) || n < opts.min || n > opts.max) return "invalid";
  return n;
}

type MatchDurationKey = "firstHalfMinutes" | "halftimeBreakMinutes" | "secondHalfMinutes";

function durationStrFromCategory(
  league: MyLeaguesApiItem | null,
  categoryId: string,
  key: MatchDurationKey,
): string {
  if (!categoryId || !league) return "";
  const cat = league.categories.find((c) => c.id === categoryId);
  const v = cat?.[key];
  return v != null ? String(v) : "";
}

function durationStrForMatchForm(
  league: MyLeaguesApiItem | null,
  categoryId: string,
  row: MyLeaguesMatchRow | null | undefined,
  key: MatchDurationKey,
): string {
  if (row?.[key] != null) return String(row[key]);
  return durationStrFromCategory(league, categoryId, key);
}

function playersOnFieldStrFromCategory(
  league: MyLeaguesApiItem | null,
  categoryId: string,
  matchOverride?: number | null,
): string {
  if (matchOverride != null) return String(matchOverride);
  if (!categoryId || !league) return "";
  const cat = league.categories.find((c) => c.id === categoryId);
  return cat?.playersOnFieldPerTeam != null ? String(cat.playersOnFieldPerTeam) : "";
}

function roundStateFromStoredLabel(
  label: string | null,
): { preset: string; custom: string } {
  if (!label?.trim()) return { preset: "", custom: "" };
  const t = label.trim();
  const presetHit = MATCH_ROUND_OPTIONS.find(
    (o) => o.value && o.value !== MATCH_ROUND_PRESET_CUSTOM && o.value === t,
  );
  if (presetHit) return { preset: t, custom: "" };
  return { preset: MATCH_ROUND_PRESET_CUSTOM, custom: t };
}

export function NewMatchForm({
  leagues,
  venues,
  referees,
  onClose,
  onMatchCreated,
  onBusyChange,
  editRow = null,
}: NewMatchFormProps) {
  const isEdit = Boolean(editRow);
  const matchLocked = isEdit && editRow != null && !isMatchEditable(editRow.status);

  const [leagueId, setLeagueId] = useState(
    () => editRow?.leagueId ?? (leagues.length === 1 ? leagues[0]!.id : ""),
  );
  const selectedLeague = useMemo(
    () => leagues.find((l) => l.id === leagueId) ?? null,
    [leagueId, leagues],
  );

  const [seasonId, setSeasonId] = useState(() => {
    if (editRow) return editRow.seasonId;
    if (leagues.length !== 1) return "";
    return defaultSeasonIdForLeague(leagues[0]!);
  });

  const [matchCategoryId, setMatchCategoryId] = useState(() => editRow?.leagueCategoryId ?? "");
  const [playersOnFieldStr, setPlayersOnFieldStr] = useState(() => {
    if (!editRow) return "";
    const L = leagues.find((l) => l.id === editRow.leagueId) ?? null;
    return playersOnFieldStrFromCategory(
      L,
      editRow.leagueCategoryId ?? "",
      editRow.playersOnFieldPerTeam,
    );
  });
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeamRow[]>([]);
  const [teamsLoad, setTeamsLoad] = useState<"idle" | "loading" | "error">("idle");
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [homeTeamId, setHomeTeamId] = useState(() => editRow?.homeTeamId ?? "");
  const [awayTeamId, setAwayTeamId] = useState(() => editRow?.awayTeamId ?? "");
  const [scheduledDate, setScheduledDate] = useState(
    () => (editRow ? isoToBrowserLocalDateTime(editRow.scheduledAt)?.dateStr ?? "" : ""),
  );
  const [scheduledHour12, setScheduledHour12] = useState(
    () => isoToBrowserLocalDateTime(editRow?.scheduledAt ?? "")?.hour12 ?? 7,
  );
  const [scheduledMinute, setScheduledMinute] = useState(
    () => isoToBrowserLocalDateTime(editRow?.scheduledAt ?? "")?.minute ?? 0,
  );
  const [scheduledMeridiem, setScheduledMeridiem] = useState<"AM" | "PM">(
    () => isoToBrowserLocalDateTime(editRow?.scheduledAt ?? "")?.meridiem ?? "PM",
  );
  const [venueId, setVenueId] = useState(() => editRow?.venueId ?? "");
  const [notes, setNotes] = useState(() => editRow?.notes ?? "");
  const [roundPreset, setRoundPreset] = useState(() =>
    editRow ? roundStateFromStoredLabel(editRow.roundLabel).preset : "",
  );
  const [roundLabelCustom, setRoundLabelCustom] = useState(() =>
    editRow ? roundStateFromStoredLabel(editRow.roundLabel).custom : "",
  );

  const [leagueRefereeId, setLeagueRefereeId] = useState(
    () => editRow?.leagueRefereeId ?? "",
  );

  const [firstHalfStr, setFirstHalfStr] = useState(() => {
    const L = editRow ? (leagues.find((l) => l.id === editRow.leagueId) ?? null) : null;
    return durationStrForMatchForm(
      L,
      editRow?.leagueCategoryId ?? "",
      editRow,
      "firstHalfMinutes",
    );
  });
  const [halftimeStr, setHalftimeStr] = useState(() => {
    const L = editRow ? (leagues.find((l) => l.id === editRow.leagueId) ?? null) : null;
    return durationStrForMatchForm(
      L,
      editRow?.leagueCategoryId ?? "",
      editRow,
      "halftimeBreakMinutes",
    );
  });
  const [secondHalfStr, setSecondHalfStr] = useState(() => {
    const L = editRow ? (leagues.find((l) => l.id === editRow.leagueId) ?? null) : null;
    return durationStrForMatchForm(
      L,
      editRow?.leagueCategoryId ?? "",
      editRow,
      "secondHalfMinutes",
    );
  });

  const refereesForLeague = useMemo(() => {
    if (!leagueId) return [];
    return referees
      .filter((r) => r.leagueId === leagueId)
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
  }, [referees, leagueId]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onBusyChange?.(submitting);
  }, [submitting, onBusyChange]);

  useEffect(() => {
    return () => {
      onBusyChange?.(false);
    };
  }, [onBusyChange]);

  useEffect(() => {
    if (isEdit || !selectedLeague?.seasons.length) return;
    if (selectedLeague.seasons.length === 1) {
      const only = selectedLeague.seasons[0]!.id;
      if (seasonId !== only) queueMicrotask(() => setSeasonId(only));
    }
  }, [isEdit, selectedLeague, seasonId]);

  useEffect(() => {
    if (!leagueId || !seasonId) {
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      setTeamsLoad("loading");
      setTeamsError(null);
      try {
        const res = await fetch(
          `/api/leagues/${encodeURIComponent(leagueId)}/seasons/${encodeURIComponent(seasonId)}/teams`,
        );
        let data: { error?: string; teams?: SeasonTeamRow[] } = {};
        try {
          data = (await res.json()) as typeof data;
        } catch {
          /* ignore */
        }
        if (cancelled) return;
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        if (!res.ok) {
          setTeamsLoad("error");
          setTeamsError(
            typeof data.error === "string" ? data.error : "No se pudieron cargar los equipos.",
          );
          setSeasonTeams([]);
          return;
        }
        setSeasonTeams(Array.isArray(data.teams) ? data.teams : []);
        setTeamsLoad("idle");
      } catch {
        if (!cancelled) {
          setTeamsLoad("error");
          setTeamsError("No se pudieron cargar los equipos.");
          setSeasonTeams([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leagueId, seasonId]);

  function handleLeagueChange(nextLeagueId: string) {
    if (isEdit) return;
    setLeagueId(nextLeagueId);
    const L = leagues.find((l) => l.id === nextLeagueId) ?? null;
    setSeasonId(defaultSeasonIdForLeague(L));
    setMatchCategoryId("");
    setPlayersOnFieldStr("");
    setFirstHalfStr("");
    setHalftimeStr("");
    setSecondHalfStr("");
    setHomeTeamId("");
    setAwayTeamId("");
    setRoundPreset("");
    setRoundLabelCustom("");
    setSeasonTeams([]);
    setTeamsLoad("idle");
    setTeamsError(null);
    setLeagueRefereeId("");
  }

  const visibleTeams = useMemo(() => {
    if (!matchCategoryId) return seasonTeams;
    return seasonTeams.filter((t) => t.leagueCategoryId === matchCategoryId);
  }, [seasonTeams, matchCategoryId]);

  const leagueVenues = useMemo(
    () => venues.filter((v) => v.leagueId === leagueId),
    [venues, leagueId],
  );

  function resetForm() {
    setMatchCategoryId("");
    setHomeTeamId("");
    setAwayTeamId("");
    setScheduledDate("");
    setScheduledHour12(7);
    setScheduledMinute(0);
    setScheduledMeridiem("PM");
    setVenueId("");
    setNotes("");
    setRoundPreset("");
    setRoundLabelCustom("");
    setFieldErrors({});
    setSubmitError(null);
    setLeagueRefereeId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    if (matchLocked) {
      setSubmitError("Este partido ya está terminado o resuelto por walkover y no se puede editar.");
      return;
    }

    if (!isEdit && !leagueId.trim()) {
      setFieldErrors({ leagueId: "Elegí una liga." });
      return;
    }

    if (!scheduledDate.trim()) {
      setFieldErrors({ scheduledAt: "Indica la fecha del partido." });
      return;
    }
    const minuteNum = Number(scheduledMinute);
    if (
      !Number.isFinite(minuteNum) ||
      !Number.isInteger(minuteNum) ||
      minuteNum < 0 ||
      minuteNum > 59
    ) {
      setFieldErrors({ scheduledAt: "Los minutos deben ser un entero entre 0 y 59." });
      return;
    }
    const scheduledAtIso = localDatePartsToIso(
      scheduledDate,
      scheduledHour12,
      minuteNum,
      scheduledMeridiem,
    );
    if (!scheduledAtIso) {
      setFieldErrors({ scheduledAt: "Fecha u hora no válida." });
      return;
    }

    let roundLabel: string | null = null;
    if (roundPreset === MATCH_ROUND_PRESET_CUSTOM) {
      const t = roundLabelCustom.trim();
      if (!t) {
        setFieldErrors({ roundLabel: "Escribe la fase o el tipo de partido." });
        return;
      }
      roundLabel = t;
    } else if (roundPreset.trim()) {
      roundLabel = roundPreset.trim();
    }

    let playersOnFieldPerTeam: number | null = null;
    if (matchCategoryId.trim()) {
      const playersOnField = parseOptionalPositiveInt(playersOnFieldStr);
      if (playersOnField === "invalid") {
        setFieldErrors({
          playersOnFieldPerTeam: "Indica un entero entre 1 y 99 o dejá vacío.",
        });
        return;
      }
      playersOnFieldPerTeam = playersOnField;
    }

    let firstHalfMinutes: number | null = null;
    let halftimeBreakMinutes: number | null = null;
    let secondHalfMinutes: number | null = null;

    if (matchCategoryId.trim()) {
      const nextDurationErrors: Record<string, string> = {};
      const firstHalf = parseRequiredDurationMinutes(firstHalfStr, { min: 1, max: 120 });
      const halftime = parseRequiredDurationMinutes(halftimeStr, { min: 0, max: 60 });
      const secondHalf = parseRequiredDurationMinutes(secondHalfStr, { min: 1, max: 120 });
      if (firstHalf === "empty") {
        nextDurationErrors.firstHalfMinutes = "Indica los minutos del primer tiempo.";
      } else if (firstHalf === "invalid") {
        nextDurationErrors.firstHalfMinutes = "Usá un entero entre 1 y 120.";
      }
      if (halftime === "empty") {
        nextDurationErrors.halftimeBreakMinutes = "Indica los minutos de descanso.";
      } else if (halftime === "invalid") {
        nextDurationErrors.halftimeBreakMinutes = "Usá un entero entre 0 y 60.";
      }
      if (secondHalf === "empty") {
        nextDurationErrors.secondHalfMinutes = "Indica los minutos del segundo tiempo.";
      } else if (secondHalf === "invalid") {
        nextDurationErrors.secondHalfMinutes = "Usá un entero entre 1 y 120.";
      }
      if (Object.keys(nextDurationErrors).length > 0) {
        setFieldErrors(nextDurationErrors);
        return;
      }
      firstHalfMinutes = firstHalf as number;
      halftimeBreakMinutes = halftime as number;
      secondHalfMinutes = secondHalf as number;
    }

    const body = {
      seasonId,
      homeTeamId,
      awayTeamId,
      scheduledAt: scheduledAtIso,
      roundLabel,
      venueId: venueId.trim() ? venueId.trim() : null,
      leagueCategoryId: matchCategoryId.trim() ? matchCategoryId.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      leagueRefereeId: leagueRefereeId.trim() ? leagueRefereeId.trim() : null,
      playersOnFieldPerTeam,
      firstHalfMinutes,
      halftimeBreakMinutes,
      secondHalfMinutes,
    };

    const parsed = newMatchJsonSchema.safeParse(body);
    if (!parsed.success) {
      const zErr: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && zErr[key] === undefined) {
          zErr[key] = issue.message;
        }
      }
      setFieldErrors(zErr);
      return;
    }

    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/leagues/${encodeURIComponent(leagueId)}/matches/${encodeURIComponent(editRow!.id)}`
        : `/api/leagues/${encodeURIComponent(leagueId)}/matches`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      let data: { error?: string; fields?: Record<string, string> } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        /* ignore */
      }

      if (res.status === 401) {
        window.location.href = "/";
        return;
      }

      if (!res.ok) {
        if (data.fields && typeof data.fields === "object") {
          setFieldErrors(data.fields);
        }
        setSubmitError(
          typeof data.error === "string"
            ? data.error
            : isEdit
              ? "No se pudo guardar el partido. Intenta de nuevo."
              : "No se pudo crear el partido. Intenta de nuevo.",
        );
        return;
      }

      onMatchCreated?.();
      if (!isEdit) {
        resetForm();
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const noSeasons = !selectedLeague?.seasons.length;
  const canPickTeams = !noSeasons && teamsLoad !== "loading" && teamsLoad !== "error";

  return (
    <div className="w-full">
      <p className="text-foreground-muted mb-6 text-sm leading-relaxed">
        {isEdit ? (
          <>
            Cambios en <code className="text-foreground-muted text-xs">matches</code> para este
            partido. Las mismas reglas que al crear: equipos inscritos en la temporada (
            <code className="text-foreground-muted text-xs">season_teams</code>
            ). Zona horaria de la liga:{" "}
            <code className="text-foreground-muted text-xs">{selectedLeague?.timezone ?? "—"}</code>.
          </>
        ) : (
          <>
            Primero elegís la <span className="text-foreground font-medium">liga</span>: las
            categorías salen de esa liga. El partido se
            guarda en <code className="text-foreground-muted text-xs">matches</code> con{" "}
            <code className="text-foreground-muted text-xs">season_id</code> (si hay varias
            temporadas, elegís cuál). Equipos validados en{" "}
            <code className="text-foreground-muted text-xs">season_teams</code>. Zona horaria:{" "}
            <code className="text-foreground-muted text-xs">{selectedLeague?.timezone ?? "—"}</code>.
          </>
        )}
      </p>

      {matchLocked ? (
        <div className="border-border bg-surface-code/30 text-foreground-muted mb-4 rounded-brand-md border px-3 py-2.5 text-sm leading-relaxed">
          Este partido ya está terminado o resuelto por walkover. Los datos del fixture no se pueden
          modificar desde aquí.
        </div>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <fieldset disabled={matchLocked} className="flex min-w-0 flex-col gap-4 border-0 p-0">
        {submitError ? (
          <div className="border-border bg-brand-purple/15 text-brand-navy rounded-brand-md border px-3 py-2.5 text-sm">
            {submitError}
          </div>
        ) : null}

        {!isEdit && leagues.length > 0 ? (
          <label className="block">
            <span className="text-foreground-muted text-xs font-medium">
              Liga <span className="text-brand-purple">*</span>
            </span>
            <div className="relative mt-1">
              <select
                value={leagueId}
                onChange={(e) => handleLeagueChange(e.target.value)}
                required
                disabled={submitting}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 hover:border-brand-teal/40 w-full cursor-pointer appearance-none rounded-brand-md border px-3 py-2 pr-10 text-sm outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                aria-invalid={!!fieldErrors.leagueId}
                aria-required
              >
                {leagues.length > 1 ? <option value="">Elegí una liga…</option> : null}
                {leagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <span
                className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                aria-hidden
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="opacity-70"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
            {fieldErrors.leagueId ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.leagueId}</span>
            ) : null}
          </label>
        ) : isEdit ? (
          <p className="text-foreground-muted text-sm">
            Liga: <span className="text-foreground font-medium">{editRow!.leagueName}</span>
          </p>
        ) : null}

        {!isEdit && selectedLeague && selectedLeague.seasons.length > 1 ? (
          <label className="block">
            <span className="text-foreground-muted text-xs font-medium">
              Temporada <span className="text-brand-purple">*</span>
            </span>
            <div className="relative mt-1">
              <select
                value={seasonId}
                onChange={(e) => {
                  setSeasonId(e.target.value);
                  setHomeTeamId("");
                  setAwayTeamId("");
                  setSeasonTeams([]);
                  setTeamsLoad("loading");
                  setTeamsError(null);
                }}
                required
                disabled={noSeasons || submitting}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 hover:border-brand-teal/40 w-full cursor-pointer appearance-none rounded-brand-md border px-3 py-2 pr-10 text-sm outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectedLeague.seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.status === "in_progress" ? " · en curso" : ""}
                  </option>
                ))}
              </select>
              <span
                className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                aria-hidden
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="opacity-70"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
          </label>
        ) : !isEdit && selectedLeague && selectedLeague.seasons.length === 1 ? (
          <p className="text-foreground-muted text-sm">
            Temporada:{" "}
            <span className="text-foreground font-medium">
              {selectedLeague.seasons[0]!.name}
              {selectedLeague.seasons[0]!.status === "in_progress" ? " · en curso" : ""}
            </span>
          </p>
        ) : isEdit ? (
          <label className="block">
            <span className="text-foreground-muted text-xs font-medium">Temporada</span>
            <div className="relative mt-1">
              <select
                value={seasonId}
                onChange={(e) => {
                  setSeasonId(e.target.value);
                  setHomeTeamId("");
                  setAwayTeamId("");
                  setSeasonTeams([]);
                  setTeamsLoad("loading");
                  setTeamsError(null);
                }}
                disabled={noSeasons}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 hover:border-brand-teal/40 w-full cursor-pointer appearance-none rounded-brand-md border px-3 py-2 pr-10 text-sm outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {noSeasons ? (
                  <option value="">Sin temporadas</option>
                ) : (
                  selectedLeague!.seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.status === "in_progress" ? " · en curso" : ""}
                    </option>
                  ))
                )}
              </select>
              <span
                className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                aria-hidden
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="opacity-70"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
            {noSeasons ? (
              <span className="text-brand-purple mt-1 block text-xs">
                No hay temporadas en esta liga. Registra un equipo para crear la primera.
              </span>
            ) : null}
          </label>
        ) : !isEdit && leagueId && noSeasons ? (
          <p className="text-brand-purple text-sm">
            No hay temporadas en esta liga. Registra un equipo para crear la primera.
          </p>
        ) : null}

        {selectedLeague && selectedLeague.categories.length > 0 ? (
          <label className="block">
            <span className="text-foreground-muted text-xs font-medium">
              Categoría del partido (opcional)
            </span>
            <div className="relative mt-1">
              <select
                value={matchCategoryId}
                onChange={(e) => {
                  const next = e.target.value;
                  setMatchCategoryId(next);
                  setHomeTeamId("");
                  setAwayTeamId("");
                  setPlayersOnFieldStr(
                    playersOnFieldStrFromCategory(selectedLeague, next),
                  );
                  if (next) {
                    setFirstHalfStr(
                      durationStrFromCategory(selectedLeague, next, "firstHalfMinutes"),
                    );
                    setHalftimeStr(
                      durationStrFromCategory(selectedLeague, next, "halftimeBreakMinutes"),
                    );
                    setSecondHalfStr(
                      durationStrFromCategory(selectedLeague, next, "secondHalfMinutes"),
                    );
                  } else {
                    setFirstHalfStr("");
                    setHalftimeStr("");
                    setSecondHalfStr("");
                  }
                }}
                disabled={noSeasons}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 hover:border-brand-teal/40 w-full cursor-pointer appearance-none rounded-brand-md border px-3 py-2 pr-10 text-sm outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Sin categoría en el partido</option>
                {selectedLeague.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span
                className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                aria-hidden
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="opacity-70"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
            <span className="text-foreground-subtle mt-1 block text-[10px] leading-relaxed">
              Si eliges categoría, solo verás equipos inscritos en esa categoría en la temporada; el
              partido guarda <code className="text-foreground-muted">league_category_id</code>.
            </span>
          </label>
        ) : null}

        {matchCategoryId ? (
          <label className="block">
            <span className="text-foreground-muted text-xs font-medium">
              Jugadores en cancha por equipo
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              name="playersOnFieldPerTeam"
              value={playersOnFieldStr}
              onChange={(e) => setPlayersOnFieldStr(e.target.value)}
              disabled={noSeasons}
              placeholder="Vacío = sin valor en este partido"
              className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-invalid={!!fieldErrors.playersOnFieldPerTeam}
            />
            {fieldErrors.playersOnFieldPerTeam ? (
              <span className="text-brand-purple mt-1 block text-xs">
                {fieldErrors.playersOnFieldPerTeam}
              </span>
            ) : (
              <span className="text-foreground-subtle mt-1 block text-[10px] leading-relaxed">
                Se precarga desde la categoría si existe. Lo que guardes aquí va solo a este partido (
                <code className="text-foreground-muted">matches.report</code>), sin cambiar la
                categoría.
              </span>
            )}
          </label>
        ) : null}

        {leagueId ? (
          <label className="block">
            <span className="text-foreground-muted text-xs font-medium">Árbitro (opcional)</span>
            <div className="relative mt-1">
              <select
                value={leagueRefereeId}
                onChange={(e) => setLeagueRefereeId(e.target.value)}
                disabled={submitting || !leagueId}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 hover:border-brand-teal/40 w-full cursor-pointer appearance-none rounded-brand-md border px-3 py-2 pr-10 text-sm outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">— Sin árbitro asignado —</option>
                {refereesForLeague.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName}
                  </option>
                ))}
              </select>
              <span
                className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                aria-hidden
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="opacity-70"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
            <span className="text-foreground-subtle mt-1 block text-[10px] leading-relaxed">
              Directorio <code className="text-foreground-muted">league_referees</code> de esta
              liga. Opcional; se guarda en <code className="text-foreground-muted">matches.league_referee_id</code>.
            </span>
          </label>
        ) : null}

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Fase del torneo</span>
          <div className="relative mt-1">
            <select
              value={roundPreset}
              onChange={(e) => {
                setRoundPreset(e.target.value);
                if (e.target.value !== MATCH_ROUND_PRESET_CUSTOM) {
                  setRoundLabelCustom("");
                }
              }}
              disabled={noSeasons}
              className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 hover:border-brand-teal/40 w-full cursor-pointer appearance-none rounded-brand-md border px-3 py-2 pr-10 text-sm outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
              aria-invalid={!!fieldErrors.roundLabel}
            >
              {MATCH_ROUND_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span
              className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
              aria-hidden
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="opacity-70"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </div>
          {roundPreset === MATCH_ROUND_PRESET_CUSTOM ? (
            <input
              type="text"
              value={roundLabelCustom}
              onChange={(e) => setRoundLabelCustom(e.target.value)}
              maxLength={120}
              placeholder="Ej. Ida, vuelta, reclasificación…"
              disabled={noSeasons}
              className="border-border bg-surface-code/40 mt-2 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-invalid={!!fieldErrors.roundLabel}
            />
          ) : null}
          {fieldErrors.roundLabel ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.roundLabel}</span>
          ) : (
            <span className="text-foreground-subtle mt-1 block text-[10px] leading-relaxed">
              Se guarda en <code className="text-foreground-muted">matches.round_label</code> para
              calendarios y tablas (no hay enum en base: puedes usar atajos o texto propio).
            </span>
          )}
        </label>

        {teamsLoad === "loading" ? (
          <p className="text-foreground-muted text-sm">Cargando equipos de la temporada…</p>
        ) : teamsLoad === "error" ? (
          <p className="text-brand-purple text-sm">{teamsError}</p>
        ) : canPickTeams && visibleTeams.length === 0 ? (
          <p className="text-foreground-muted text-sm">
            No hay equipos inscritos en esta temporada
            {matchCategoryId ? " para la categoría elegida" : ""}.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-1">
            <span className="text-foreground-muted text-xs font-medium">Local</span>
            <div className="relative mt-1">
              <select
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
                disabled={!canPickTeams || visibleTeams.length < 2}
                required
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 w-full cursor-pointer appearance-none rounded-brand-md border px-3 py-2 pr-10 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-invalid={!!fieldErrors.homeTeamId}
              >
                <option value="">Elige un equipo</option>
                {visibleTeams.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === awayTeamId}>
                    {t.shortName?.trim() ? `${t.name} (${t.shortName})` : t.name}
                  </option>
                ))}
              </select>
              <span
                className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                aria-hidden
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="opacity-70"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
            {fieldErrors.homeTeamId ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.homeTeamId}</span>
            ) : null}
          </label>

          <label className="block sm:col-span-1">
            <span className="text-foreground-muted text-xs font-medium">Visitante</span>
            <div className="relative mt-1">
              <select
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
                disabled={!canPickTeams || visibleTeams.length < 2}
                required
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 w-full cursor-pointer appearance-none rounded-brand-md border px-3 py-2 pr-10 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-invalid={!!fieldErrors.awayTeamId}
              >
                <option value="">Elige un equipo</option>
                {visibleTeams.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === homeTeamId}>
                    {t.shortName?.trim() ? `${t.name} (${t.shortName})` : t.name}
                  </option>
                ))}
              </select>
              <span
                className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                aria-hidden
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="opacity-70"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
            {fieldErrors.awayTeamId ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.awayTeamId}</span>
            ) : null}
          </label>
        </div>

        {matchCategoryId ? (
        <fieldset className="border-border rounded-brand-md border px-3 py-3">
          <legend className="text-foreground-muted px-1 text-xs font-medium">
            Duración de este partido <span className="text-brand-teal">*</span>
          </legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-foreground-muted text-xs font-medium">
                Primer tiempo (min) <span className="text-brand-teal">*</span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                name="firstHalfMinutes"
                value={firstHalfStr}
                onChange={(e) => setFirstHalfStr(e.target.value)}
                required
                disabled={noSeasons}
                className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-teal/50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-invalid={!!fieldErrors.firstHalfMinutes}
              />
              {fieldErrors.firstHalfMinutes ? (
                <span className="text-brand-purple mt-1 block text-xs">
                  {fieldErrors.firstHalfMinutes}
                </span>
              ) : null}
            </label>
            <label className="block">
              <span className="text-foreground-muted text-xs font-medium">
                Medio tiempo / descanso (min) <span className="text-brand-teal">*</span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                name="halftimeBreakMinutes"
                value={halftimeStr}
                onChange={(e) => setHalftimeStr(e.target.value)}
                required
                disabled={noSeasons}
                className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-teal/50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-invalid={!!fieldErrors.halftimeBreakMinutes}
              />
              {fieldErrors.halftimeBreakMinutes ? (
                <span className="text-brand-purple mt-1 block text-xs">
                  {fieldErrors.halftimeBreakMinutes}
                </span>
              ) : null}
            </label>
            <label className="block">
              <span className="text-foreground-muted text-xs font-medium">
                Segundo tiempo (min) <span className="text-brand-teal">*</span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                name="secondHalfMinutes"
                value={secondHalfStr}
                onChange={(e) => setSecondHalfStr(e.target.value)}
                required
                disabled={noSeasons}
                className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-teal/50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-invalid={!!fieldErrors.secondHalfMinutes}
              />
              {fieldErrors.secondHalfMinutes ? (
                <span className="text-brand-purple mt-1 block text-xs">
                  {fieldErrors.secondHalfMinutes}
                </span>
              ) : null}
            </label>
          </div>
          <p className="text-foreground-subtle mt-2 text-[10px] leading-relaxed">
            Precargado desde la categoría; si lo cambiás solo afecta este partido (
            <code className="text-foreground-muted">matches.report</code>).
          </p>
        </fieldset>
        ) : null}

        <div className="block">
          <span className="text-foreground-muted text-xs font-medium">Fecha y hora</span>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="block min-w-[10rem] flex-1">
              <span className="text-foreground-subtle mb-1 block text-[10px] font-medium uppercase tracking-wide">
                Fecha
              </span>
              <input
                type="date"
                name="scheduledDate"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                className="border-border bg-surface-code/40 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
                aria-invalid={!!fieldErrors.scheduledAt}
              />
            </label>
            <div className="flex flex-wrap items-end gap-2 sm:gap-3">
              <label className="block w-[4.5rem]">
                <span className="text-foreground-subtle mb-1 block text-[10px] font-medium uppercase tracking-wide">
                  Hora
                </span>
                <select
                  value={scheduledHour12}
                  onChange={(e) => setScheduledHour12(Number(e.target.value))}
                  className="border-border bg-surface-code/40 w-full cursor-pointer appearance-none rounded-brand-md border px-2 py-2 pr-7 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
                  aria-invalid={!!fieldErrors.scheduledAt}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block w-[4rem]">
                <span className="text-foreground-subtle mb-1 block text-[10px] font-medium uppercase tracking-wide">
                  Min
                </span>
                <input
                  type="number"
                  name="scheduledMinute"
                  min={0}
                  max={59}
                  step={1}
                  value={scheduledMinute}
                  onChange={(e) => setScheduledMinute(Number(e.target.value))}
                  className="border-border bg-surface-code/40 w-full rounded-brand-md border px-2 py-2 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
                  aria-invalid={!!fieldErrors.scheduledAt}
                />
              </label>
              <label className="block w-[5.5rem]">
                <span className="text-foreground-subtle mb-1 block text-[10px] font-medium uppercase tracking-wide">
                  &nbsp;
                </span>
                <select
                  value={scheduledMeridiem}
                  onChange={(e) => setScheduledMeridiem(e.target.value as "AM" | "PM")}
                  className="border-border bg-surface-code/40 w-full cursor-pointer appearance-none rounded-brand-md border px-2 py-2 pr-7 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
                  aria-invalid={!!fieldErrors.scheduledAt}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </label>
            </div>
          </div>
          {fieldErrors.scheduledAt ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.scheduledAt}</span>
          ) : (
            <span className="text-foreground-subtle mt-1 block text-[10px] leading-relaxed">
              Hora en formato 12 h (AM / PM), interpretada en la zona horaria de tu dispositivo; al
              guardar se usa también el timezone de la liga.
            </span>
          )}
        </div>

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Cancha (opcional)</span>
          <div className="relative mt-1">
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 hover:border-brand-teal/40 w-full cursor-pointer appearance-none rounded-brand-md border px-3 py-2 pr-10 text-sm outline-none transition-colors focus-visible:ring-2"
            >
              <option value="">—</option>
              {leagueVenues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <span
              className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
              aria-hidden
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="opacity-70"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </div>
          {fieldErrors.venueId ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.venueId}</span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Notas (opcional)</span>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            className="border-border bg-surface-code/40 mt-1 w-full resize-y rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
            aria-invalid={!!fieldErrors.notes}
          />
          {fieldErrors.notes ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.notes}</span>
          ) : null}
        </label>

        </fieldset>

        <div className="border-border mt-2 flex flex-wrap gap-3 border-t pt-5">
          <button
            type="button"
            className="border-border text-foreground-muted hover:text-foreground rounded-full border px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            onClick={() => {
              if (!isEdit) {
                resetForm();
              }
              onClose();
            }}
            disabled={submitting}
          >
            {matchLocked ? "Cerrar" : "Cancelar"}
          </button>
          {!matchLocked ? (
            <button
              type="submit"
              className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              disabled={
                submitting ||
                noSeasons ||
                teamsLoad === "loading" ||
                visibleTeams.length < 2 ||
                (!isEdit && !leagueId.trim())
              }
            >
              {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Programar partido"}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
