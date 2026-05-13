"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_WHATSAPP_COUNTRY_ISO2,
  flagEmojiFromIso2,
  getCountryDialOptions,
} from "@/lib/phone/country-dial-options";

import {
  PLAYER_CURP_ACCEPT_ATTR,
  PLAYER_CURP_MAX_FILE_BYTES,
  PLAYER_CURP_MIME_TYPES,
  PLAYER_PHOTO_ACCEPT_ATTR,
  PLAYER_PHOTO_MAX_FILE_BYTES,
  PLAYER_PHOTO_MIME_TYPES,
} from "./new-player-file-constraints";
import type { MyLeaguesTeamRow } from "./my-leagues-state";

type NewPlayerFormProps = {
  teamRows: readonly MyLeaguesTeamRow[];
  onClose: () => void;
  onPlayerCreated?: () => void;
  /** Si viene, el equipo queda preseleccionado y el dropdown bloqueado. */
  prefillTeamId?: string;
};

/**
 * Posiciones para fútbol 5 / futbolito de auditorio (esquema 1-1-2-1).
 * La DB guarda texto libre en `team_rosters.position`, así que mandamos el código
 * abreviado y dejamos "Otra…" para casos fuera del catálogo (futsal, etc.).
 *
 * Cuando la app crezca a otros formatos (f7, f11, futsal), podemos parametrizar
 * este catálogo por `sportCode` / formato del equipo seleccionado.
 */
const PLAYER_POSITION_PRESETS = [
  { value: "POR", label: "Portero (POR)" },
  { value: "DEF", label: "Defensa (DEF)" },
  { value: "MED", label: "Medio (MED)" },
  { value: "DEL", label: "Delantero (DEL)" },
  { value: "POL", label: "Polivalente / Comodín (POL)" },
] as const;
const POSITION_OTHER_VALUE = "__other__";

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Quita acentos y pasa a minúsculas para búsqueda tolerante. */
function normalizeForSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function teamDisplayLabel(t: MyLeaguesTeamRow): string {
  return `${t.name} — ${t.leagueName}${t.categoryName ? ` · ${t.categoryName}` : ""}`;
}

function teamMatchesQuery(t: MyLeaguesTeamRow, queryNorm: string): boolean {
  if (!queryNorm) return true;
  const haystack = normalizeForSearch(
    [t.name, t.shortName ?? "", t.leagueName, t.categoryName ?? ""].join(" | "),
  );
  return haystack.includes(queryNorm);
}

export function NewPlayerForm({
  teamRows,
  onClose,
  onPlayerCreated,
  prefillTeamId,
}: NewPlayerFormProps) {
  const countryDialOptions = useMemo(() => getCountryDialOptions(), []);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const curpInputRef = useRef<HTMLInputElement>(null);

  const initialTeamId = useMemo<string>(() => {
    if (prefillTeamId && teamRows.some((t) => t.id === prefillTeamId)) {
      return prefillTeamId;
    }
    return teamRows.length === 1 ? teamRows[0]!.id : "";
  }, [prefillTeamId, teamRows]);

  const [teamId, setTeamId] = useState<string>(initialTeamId);
  const [teamSearch, setTeamSearch] = useState<string>(() => {
    const t = teamRows.find((x) => x.id === initialTeamId);
    return t ? teamDisplayLabel(t) : "";
  });
  const [teamListOpen, setTeamListOpen] = useState(false);
  const [teamHighlight, setTeamHighlight] = useState(-1);
  const teamComboWrapRef = useRef<HTMLDivElement>(null);
  const teamSearchInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [shirtNumber, setShirtNumber] = useState("");
  const [positionPreset, setPositionPreset] = useState<string>("");
  const [positionCustom, setPositionCustom] = useState<string>("");
  const [whatsappCountryIso, setWhatsappCountryIso] = useState(DEFAULT_WHATSAPP_COUNTRY_ISO2);
  const [whatsappPhone, setWhatsappPhone] = useState("");

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [curp, setCurp] = useState<File | null>(null);
  const [curpError, setCurpError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!photo) {
      setPhotoPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photo]);

  const selectedTeam = useMemo(
    () => teamRows.find((t) => t.id === teamId) ?? null,
    [teamRows, teamId],
  );

  const filteredTeams = useMemo(() => {
    const isShowingSelectedLabel =
      selectedTeam !== null && teamSearch === teamDisplayLabel(selectedTeam);
    const queryNorm = isShowingSelectedLabel ? "" : normalizeForSearch(teamSearch);
    if (!queryNorm) return teamRows;
    return teamRows.filter((t) => teamMatchesQuery(t, queryNorm));
  }, [teamRows, teamSearch, selectedTeam]);

  useEffect(() => {
    if (!teamListOpen) return;
    function handler(e: MouseEvent) {
      const wrap = teamComboWrapRef.current;
      if (!wrap) return;
      if (!wrap.contains(e.target as Node)) {
        setTeamListOpen(false);
        setTeamHighlight(-1);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [teamListOpen]);

  function selectTeamRow(t: MyLeaguesTeamRow) {
    setTeamId(t.id);
    setTeamSearch(teamDisplayLabel(t));
    setTeamListOpen(false);
    setTeamHighlight(-1);
    setFieldErrors((prev) => {
      if (!prev.teamId) return prev;
      const next = { ...prev };
      delete next.teamId;
      return next;
    });
  }

  function clearTeamSelection() {
    if (prefillTeamId) return;
    setTeamId("");
    setTeamSearch("");
    setTeamListOpen(true);
    setTeamHighlight(-1);
    teamSearchInputRef.current?.focus();
  }

  function onTeamSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setTeamListOpen(false);
      setTeamHighlight(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setTeamListOpen(true);
      setTeamHighlight((i) =>
        filteredTeams.length === 0 ? -1 : Math.min(i + 1, filteredTeams.length - 1),
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setTeamHighlight((i) => (i <= 0 ? 0 : i - 1));
      return;
    }
    if (e.key === "Enter") {
      if (
        teamListOpen &&
        teamHighlight >= 0 &&
        teamHighlight < filteredTeams.length
      ) {
        e.preventDefault();
        const t = filteredTeams[teamHighlight];
        if (t) selectTeamRow(t);
      }
    }
  }

  function onPhotoChange(file: File | null) {
    setPhotoError(null);
    if (!file) {
      setPhoto(null);
      return;
    }
    if (!PLAYER_PHOTO_MIME_TYPES.has(file.type)) {
      setPhoto(null);
      setPhotoError("Usa JPG, PNG o WebP.");
      return;
    }
    if (file.size > PLAYER_PHOTO_MAX_FILE_BYTES) {
      setPhoto(null);
      setPhotoError(
        `La foto supera ${Math.round(PLAYER_PHOTO_MAX_FILE_BYTES / (1024 * 1024))} MB.`,
      );
      return;
    }
    setPhoto(file);
  }

  function onCurpChange(file: File | null) {
    setCurpError(null);
    if (!file) {
      setCurp(null);
      return;
    }
    if (!PLAYER_CURP_MIME_TYPES.has(file.type)) {
      setCurp(null);
      setCurpError("Usa PDF, JPG, PNG o WebP.");
      return;
    }
    if (file.size > PLAYER_CURP_MAX_FILE_BYTES) {
      setCurp(null);
      setCurpError(
        `El archivo supera ${Math.round(PLAYER_CURP_MAX_FILE_BYTES / (1024 * 1024))} MB.`,
      );
      return;
    }
    setCurp(file);
  }

  function resetForm() {
    const resetTeamId = initialTeamId;
    setTeamId(resetTeamId);
    const t = teamRows.find((x) => x.id === resetTeamId);
    setTeamSearch(t ? teamDisplayLabel(t) : "");
    setTeamListOpen(false);
    setTeamHighlight(-1);
    setFullName("");
    setShirtNumber("");
    setPositionPreset("");
    setPositionCustom("");
    setWhatsappCountryIso(DEFAULT_WHATSAPP_COUNTRY_ISO2);
    setWhatsappPhone("");
    setPhoto(null);
    setCurp(null);
    setPhotoError(null);
    setCurpError(null);
    setFieldErrors({});
    setSubmitError(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (curpInputRef.current) curpInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    if (!teamId) {
      setFieldErrors({ teamId: "Selecciona un equipo." });
      return;
    }
    if (!selectedTeam) {
      setFieldErrors({ teamId: "El equipo seleccionado ya no está disponible." });
      return;
    }

    const positionToSubmit =
      positionPreset === POSITION_OTHER_VALUE
        ? positionCustom.trim()
        : positionPreset;

    if (positionPreset === POSITION_OTHER_VALUE && !positionToSubmit) {
      setFieldErrors({ position: "Captura la posición o elige una de la lista." });
      return;
    }

    const fd = new FormData();
    fd.set("fullName", fullName);
    fd.set("shirtNumber", shirtNumber);
    fd.set("position", positionToSubmit);
    fd.set("whatsappCountryIso", whatsappCountryIso);
    fd.set("whatsappPhoneNational", whatsappPhone);
    if (photo) fd.set("photo", photo);
    if (curp) fd.set("curp", curp);

    setSubmitting(true);
    try {
      const url = `/api/leagues/${encodeURIComponent(selectedTeam.leagueId)}/teams/${encodeURIComponent(selectedTeam.id)}/players`;
      const res = await fetch(url, { method: "POST", body: fd });

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
            : "No se pudo agregar al jugador. Inténtalo de nuevo.",
        );
        return;
      }

      onPlayerCreated?.();
      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (teamRows.length === 0) {
    return (
      <div className="w-full space-y-4">
        <div className="border-border bg-surface-code/30 text-foreground-muted rounded-brand-md border px-3 py-3 text-sm">
          Aún no tienes equipos registrados. Primero crea un equipo y después regresas a
          agregar jugadores.
        </div>
        <button
          type="button"
          className="border-border text-foreground-muted hover:text-foreground rounded-full border px-5 py-2 text-sm font-medium"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="text-foreground-muted mb-6 text-sm leading-relaxed">
        El jugador se guarda en <span className="text-foreground font-medium">players</span> y se
        inscribe en la plantilla del equipo (
        <span className="text-foreground font-medium">team_rosters</span>) en la temporada
        objetivo de la liga. La foto y la CURP se suben al bucket de Storage.
      </p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {submitError ? (
          <div className="border-border bg-brand-purple/15 text-brand-navy rounded-brand-md border px-3 py-2.5 text-sm">
            {submitError}
          </div>
        ) : null}

        <div className="block">
          <label
            htmlFor="player-team-search"
            className="text-foreground-muted text-xs font-medium"
          >
            Equipo
          </label>
          <div ref={teamComboWrapRef} className="relative mt-1">
            <span
              className="text-foreground-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              aria-hidden
            >
              <SearchIcon />
            </span>
            <input
              id="player-team-search"
              ref={teamSearchInputRef}
              type="text"
              role="combobox"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={teamListOpen}
              aria-controls="player-team-listbox"
              aria-activedescendant={
                teamListOpen && teamHighlight >= 0
                  ? `player-team-option-${teamHighlight}`
                  : undefined
              }
              value={teamSearch}
              onChange={(e) => {
                setTeamSearch(e.target.value);
                setTeamListOpen(true);
                setTeamHighlight(0);
                if (teamId) {
                  setTeamId("");
                }
              }}
              onFocus={() => {
                setTeamListOpen(true);
                teamSearchInputRef.current?.select();
              }}
              onKeyDown={onTeamSearchKeyDown}
              placeholder="Busca por equipo, liga o categoría…"
              required
              disabled={Boolean(prefillTeamId)}
              className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 w-full appearance-none rounded-brand-md border py-2.5 pr-9 pl-9 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
              aria-invalid={!!fieldErrors.teamId}
            />
            {teamId && !prefillTeamId ? (
              <button
                type="button"
                onClick={clearTeamSelection}
                aria-label="Limpiar selección de equipo"
                className="text-foreground-muted hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5"
              >
                <CloseIcon />
              </button>
            ) : (
              <span
                className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                aria-hidden
              >
                <ChevronDownIcon />
              </span>
            )}

            {teamListOpen && !prefillTeamId ? (
              <ul
                id="player-team-listbox"
                role="listbox"
                className="border-border bg-background absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-brand-md border shadow-lg"
              >
                {filteredTeams.length === 0 ? (
                  <li
                    role="option"
                    aria-disabled
                    aria-selected={false}
                    className="text-foreground-muted px-3 py-2.5 text-xs italic"
                  >
                    Sin coincidencias para "{teamSearch.trim()}". Revisa el nombre del
                    equipo, la liga o la categoría.
                  </li>
                ) : (
                  filteredTeams.map((t, idx) => {
                    const isHighlight = idx === teamHighlight;
                    const isSelected = t.id === teamId;
                    return (
                      <li
                        key={t.id}
                        id={`player-team-option-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectTeamRow(t);
                        }}
                        onMouseEnter={() => setTeamHighlight(idx)}
                        className={`cursor-pointer px-3 py-2 text-sm ${
                          isHighlight
                            ? "bg-surface-code/60 text-foreground"
                            : "text-foreground hover:bg-surface-code/40"
                        }`}
                      >
                        <div className="font-medium leading-tight">{t.name}</div>
                        <div className="text-foreground-muted text-[11px] leading-tight">
                          {t.leagueName}
                          {t.categoryName ? ` · ${t.categoryName}` : ""}
                          {t.shortName ? ` · ${t.shortName}` : ""}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            ) : null}
          </div>
          {selectedTeam ? (
            <p className="text-foreground-subtle mt-1 text-[11px]">
              Equipo seleccionado:{" "}
              <span className="text-foreground font-medium">
                {selectedTeam.name} · {selectedTeam.leagueName}
              </span>
            </p>
          ) : (
            <p className="text-foreground-subtle mt-1 text-[11px]">
              Escribe para filtrar. Usa ↑↓ y Enter para seleccionar.
            </p>
          )}
          {fieldErrors.teamId ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.teamId}</span>
          ) : null}
        </div>

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Nombre del jugador</span>
          <input
            type="text"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="off"
            placeholder="Ej. Juan Pérez Hernández"
            className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
            aria-invalid={!!fieldErrors.fullName}
          />
          {fieldErrors.fullName ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.fullName}</span>
          ) : null}
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-foreground-muted text-xs font-medium">
              Número de jugador (opcional)
            </span>
            <input
              type="text"
              inputMode="numeric"
              name="shirtNumber"
              value={shirtNumber}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 3);
                setShirtNumber(d);
              }}
              placeholder="0–999"
              className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
              aria-invalid={!!fieldErrors.shirtNumber}
            />
            {fieldErrors.shirtNumber ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.shirtNumber}</span>
            ) : null}
          </label>

          <div className="block">
            <label htmlFor="player-position-select" className="text-foreground-muted text-xs font-medium">
              Posición (opcional)
            </label>
            <div className="relative mt-1">
              <select
                id="player-position-select"
                name="positionPreset"
                value={positionPreset}
                onChange={(e) => {
                  setPositionPreset(e.target.value);
                  if (e.target.value !== POSITION_OTHER_VALUE) {
                    setPositionCustom("");
                  }
                }}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 w-full appearance-none rounded-brand-md border py-2.5 pr-9 pl-3 text-sm outline-none focus-visible:ring-2"
                aria-invalid={!!fieldErrors.position}
              >
                <option value="">Sin asignar</option>
                {PLAYER_POSITION_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
                <option value={POSITION_OTHER_VALUE}>Otra…</option>
              </select>
              <span
                className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                aria-hidden
              >
                <ChevronDownIcon />
              </span>
            </div>
            {positionPreset === POSITION_OTHER_VALUE ? (
              <input
                type="text"
                name="positionCustom"
                value={positionCustom}
                onChange={(e) => setPositionCustom(e.target.value.slice(0, 60))}
                placeholder="Captura la posición"
                autoFocus
                className="border-border bg-surface-code/40 mt-2 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
                aria-invalid={!!fieldErrors.position}
              />
            ) : null}
            {fieldErrors.position ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.position}</span>
            ) : null}
          </div>
        </div>

        <fieldset className="border-border rounded-brand-md border p-3">
          <legend className="text-foreground-muted px-1 text-xs font-medium">
            WhatsApp del jugador (opcional)
          </legend>
          <p className="text-foreground-subtle mt-0.5 text-[10px] leading-snug">
            Lada por país (México por defecto). Solo número local en el segundo campo.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="relative w-full min-w-0 shrink-0 sm:max-w-[min(100%,16rem)]">
              <select
                aria-label="País y código de WhatsApp"
                value={whatsappCountryIso}
                onChange={(e) => {
                  setWhatsappCountryIso(e.target.value);
                  setWhatsappPhone("");
                }}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 max-h-12 min-h-12 w-full appearance-none rounded-brand-md border py-2.5 pr-9 pl-3 text-sm outline-none focus-visible:ring-2"
              >
                {countryDialOptions.map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {flagEmojiFromIso2(c.iso2)} {c.nameEs} (+{c.dialDigits})
                  </option>
                ))}
              </select>
              <span className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2">
                <ChevronDownIcon />
              </span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              value={whatsappPhone}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "");
                const max = whatsappCountryIso.toUpperCase() === "MX" ? 10 : 15;
                setWhatsappPhone(d.slice(0, max));
              }}
              placeholder={
                whatsappCountryIso.toUpperCase() === "MX" ? "10 dígitos" : "Número local"
              }
              className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 max-h-12 min-h-12 min-w-0 flex-1 rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
              aria-invalid={!!fieldErrors.whatsappPhoneNational}
            />
          </div>
          {fieldErrors.whatsappCountryIso ? (
            <span className="text-brand-purple mt-1 block text-xs">
              {fieldErrors.whatsappCountryIso}
            </span>
          ) : null}
          {fieldErrors.whatsappPhoneNational ? (
            <span className="text-brand-purple mt-1 block text-xs">
              {fieldErrors.whatsappPhoneNational}
            </span>
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="text-foreground-muted text-xs font-medium">
            CURP (opcional)
          </legend>
          <input
            ref={curpInputRef}
            type="file"
            accept={PLAYER_CURP_ACCEPT_ATTR}
            disabled={submitting}
            className="border-border bg-background-muted/30 mt-1 w-full cursor-pointer rounded-brand-md border border-dashed px-2 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-brand-blue file:px-2 file:py-1 file:text-xs file:text-white"
            onChange={(e) => onCurpChange(e.target.files?.[0] ?? null)}
          />
          <p className="text-foreground-subtle mt-1 text-[10px] leading-relaxed">
            PDF, JPG, PNG o WebP · máx.{" "}
            {Math.round(PLAYER_CURP_MAX_FILE_BYTES / (1024 * 1024))} MB
          </p>
          {curpError ? (
            <span className="text-brand-purple mt-1 block text-xs">{curpError}</span>
          ) : null}
          {curp ? (
            <p className="text-foreground-muted mt-1 truncate text-[11px]">
              Archivo: <span className="text-foreground font-medium">{curp.name}</span>
            </p>
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="text-foreground-muted text-xs font-medium">
            Foto del jugador (opcional)
          </legend>
          <input
            ref={photoInputRef}
            type="file"
            accept={PLAYER_PHOTO_ACCEPT_ATTR}
            disabled={submitting}
            className="border-border bg-background-muted/30 mt-1 w-full cursor-pointer rounded-brand-md border border-dashed px-2 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-brand-blue file:px-2 file:py-1 file:text-xs file:text-white"
            onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
          />
          <p className="text-foreground-subtle mt-1 text-[10px] leading-relaxed">
            JPG, PNG o WebP · máx.{" "}
            {Math.round(PLAYER_PHOTO_MAX_FILE_BYTES / (1024 * 1024))} MB
          </p>
          {photoError ? (
            <span className="text-brand-purple mt-1 block text-xs">{photoError}</span>
          ) : null}
          {photoPreviewUrl ? (
            <div className="border-border mt-2 flex justify-center rounded-brand-md border bg-surface-code/20 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreviewUrl}
                alt="Vista previa de la foto del jugador"
                className="max-h-32 max-w-32 rounded-md object-cover"
              />
            </div>
          ) : null}
        </fieldset>

        <div className="border-border flex flex-wrap gap-3 border-t pt-4">
          <button
            type="button"
            className="border-border text-foreground-muted hover:text-foreground rounded-full border px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            disabled={submitting || !teamId}
          >
            {submitting ? "Guardando…" : "Guardar jugador"}
          </button>
        </div>
      </form>
    </div>
  );
}
