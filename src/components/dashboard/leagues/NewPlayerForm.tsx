"use client";

import { flagEmojiFromIso2 } from "@/lib/phone/country-dial-options";
import {
  CURP_FORMAT_EXAMPLE,
  CURP_LENGTH,
  normalizeCurpInput,
} from "@/logic/players/curp";

import { PlayerFormTeamPicker } from "@/components/dashboard/forms/player/PlayerFormTeamPicker";
import { ChevronDownIcon } from "@/components/dashboard/forms/player/player-form-icons";
import {
  PLAYER_POSITION_PRESETS,
  POSITION_OTHER_VALUE,
} from "@/components/dashboard/forms/player/player-form-constants";
import {
  useNewPlayerForm,
  type PlayerFormEditTarget,
} from "@/components/dashboard/forms/player/use-new-player-form";

import {
  PLAYER_CURP_ACCEPT_ATTR,
  PLAYER_CURP_MAX_FILE_BYTES,
  PLAYER_PHOTO_ACCEPT_ATTR,
  PLAYER_PHOTO_MAX_FILE_BYTES,
} from "./new-player-file-constraints";
import type { MyLeaguesTeamRow } from "./my-leagues-state";

export type { PlayerFormEditTarget };

type NewPlayerFormProps = {
  teamRows: readonly MyLeaguesTeamRow[];
  onClose: () => void;
  onPlayerCreated?: () => void;
  onBusyChange?: (busy: boolean) => void;
  prefillTeamId?: string;
  editTarget?: PlayerFormEditTarget | null;
};

export function NewPlayerForm(props: NewPlayerFormProps) {
  const {
    birthDate,
    birthDateMax,
    clearTeamSelection,
    countryDialOptions,
    curpFile,
    curpFileError,
    curpFileInputRef,
    curpText,
    displayPhotoUrl,
    editLoadError,
    fieldErrors,
    filteredTeams,
    fullName,
    handleSubmit,
    isEdit,
    lockTeamSelection,
    onCurpFileChange,
    onPhotoChange,
    onTeamSearchKeyDown,
    photoError,
    photoInputRef,
    positionCustom,
    positionPreset,
    resetForm,
    selectTeamRow,
    selectedTeam,
    setBirthDate,
    setCurpText,
    setFullName,
    setPositionCustom,
    setPositionPreset,
    setShirtNumber,
    setTeamHighlight,
    setTeamId,
    setTeamListOpen,
    setTeamSearch,
    setWhatsappCountryIso,
    setWhatsappPhone,
    shirtNumber,
    showEditError,
    showEditLoading,
    showNoTeams,
    submitError,
    submitting,
    teamComboWrapRef,
    teamHighlight,
    teamId,
    teamListOpen,
    teamSearch,
    teamSearchInputRef,
    whatsappCountryIso,
    whatsappPhone,
  } = useNewPlayerForm(props);

  if (showNoTeams) {
    return (
      <div className="w-full space-y-4">
        <div className="border-border bg-surface-code/30 text-foreground-muted rounded-brand-md border px-3 py-3 text-sm">
          Aún no tienes equipos registrados. Primero crea un equipo y después regresas a
          agregar jugadores.
        </div>
        <button
          type="button"
          className="border-border text-foreground-muted hover:text-foreground rounded-full border px-5 py-2 text-sm font-medium"
          onClick={props.onClose}
        >
          Cerrar
        </button>
      </div>
    );
  }

  if (showEditLoading) {
    return (
      <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3">
        <div
          className="border-brand-teal size-10 animate-spin rounded-full border-2 border-t-transparent"
          aria-label="Cargando"
          role="status"
        />
        <p className="text-foreground-muted text-sm">Cargando jugador…</p>
      </div>
    );
  }

  if (showEditError) {
    return (
      <div className="w-full space-y-4">
        <div className="border-border bg-brand-purple/15 text-brand-navy rounded-brand-md border px-3 py-3 text-sm">
          {editLoadError ?? "No se pudo cargar el jugador."}
        </div>
        <button
          type="button"
          className="border-border text-foreground-muted hover:text-foreground rounded-full border px-5 py-2 text-sm font-medium"
          onClick={props.onClose}
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="text-foreground-muted mb-6 text-sm leading-relaxed">
        {isEdit ? (
          <>
            Modificá los datos del jugador en{" "}
            <span className="text-foreground font-medium">players</span> y la plantilla (
            <span className="text-foreground font-medium">team_rosters</span>) en la temporada
            actual. Podés subir nueva foto o CURP; si no tocás los archivos, se conservan los
            actuales.
          </>
        ) : (
          <>
            El jugador se guarda en <span className="text-foreground font-medium">players</span>{" "}
            (nombre, fecha de nacimiento) y se inscribe en la plantilla del equipo (
            <span className="text-foreground font-medium">team_rosters</span>) en la temporada
            objetivo de la liga. La CURP (texto) se guarda en el expediente del jugador; la foto y
            el escaneo de CURP se suben aparte al bucket de Storage si los adjuntás.
          </>
        )}
      </p>

      <form
        className={`relative flex flex-col gap-4 ${submitting ? "pointer-events-none" : ""}`}
        onSubmit={handleSubmit}
        aria-busy={submitting}
      >
        {submitError ? (
          <div className="border-border bg-brand-purple/15 text-brand-navy rounded-brand-md border px-3 py-2.5 text-sm">
            {submitError}
          </div>
        ) : null}

        <PlayerFormTeamPicker
          teamRows={props.teamRows}
          teamId={teamId}
          teamSearch={teamSearch}
          teamListOpen={teamListOpen}
          teamHighlight={teamHighlight}
          filteredTeams={filteredTeams}
          selectedTeam={selectedTeam}
          fieldError={fieldErrors.teamId}
          disabled={lockTeamSelection || submitting}
          lockSelection={lockTeamSelection}
          comboWrapRef={teamComboWrapRef}
          searchInputRef={teamSearchInputRef}
          onSearchChange={(value) => {
            setTeamSearch(value);
            setTeamListOpen(true);
            setTeamHighlight(0);
            if (teamId) setTeamId("");
          }}
          onSearchFocus={() => {
            setTeamListOpen(true);
            teamSearchInputRef.current?.select();
          }}
          onSearchKeyDown={onTeamSearchKeyDown}
          onSelectTeam={selectTeamRow}
          onClearSelection={clearTeamSelection}
          onHighlightIndex={setTeamHighlight}
        />

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
            disabled={submitting}
            className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50 disabled:cursor-not-allowed disabled:opacity-60"
            aria-invalid={!!fieldErrors.fullName}
          />
          {fieldErrors.fullName ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.fullName}</span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Fecha de nacimiento</span>
          <input
            id="player-birth-date"
            type="date"
            name="birthDate"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            min="1900-01-01"
            max={birthDateMax}
            autoComplete="bday"
            disabled={submitting}
            className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50 disabled:cursor-not-allowed disabled:opacity-60"
            aria-invalid={!!fieldErrors.birthDate}
          />
          {fieldErrors.birthDate ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.birthDate}</span>
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
              disabled={submitting}
              className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50 disabled:cursor-not-allowed disabled:opacity-60"
              aria-invalid={!!fieldErrors.shirtNumber}
            />
            {fieldErrors.shirtNumber ? (
              <span className="text-brand-purple mt-1 block text-xs">
                {fieldErrors.shirtNumber}
              </span>
            ) : null}
          </label>

          <div className="block">
            <label
              htmlFor="player-position-select"
              className="text-foreground-muted text-xs font-medium"
            >
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
                disabled={submitting}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 w-full appearance-none rounded-brand-md border py-2.5 pr-9 pl-3 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
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
                disabled={submitting}
                className="border-border bg-surface-code/40 mt-2 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50 disabled:cursor-not-allowed disabled:opacity-60"
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
                disabled={submitting}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 max-h-12 min-h-12 w-full appearance-none rounded-brand-md border py-2.5 pr-9 pl-3 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
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
              disabled={submitting}
              className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 max-h-12 min-h-12 min-w-0 flex-1 rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
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

        <label className="mt-4 block">
          <span className="text-foreground-muted text-xs font-medium">CURP (opcional)</span>
          <input
            type="text"
            name="docId"
            value={curpText}
            onChange={(e) => {
              const next = normalizeCurpInput(e.target.value).slice(0, CURP_LENGTH);
              setCurpText(next);
            }}
            placeholder={`${CURP_LENGTH} caracteres alfanuméricos`}
            autoComplete="off"
            spellCheck={false}
            disabled={submitting}
            className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 mt-1 w-full rounded-brand-md border px-3 py-2 font-mono text-sm tracking-wide uppercase outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
            aria-invalid={!!fieldErrors.docId}
          />
          <p className="text-foreground-subtle mt-1 text-[10px] leading-relaxed">
            Ejemplo: {CURP_FORMAT_EXAMPLE}
          </p>
          {fieldErrors.docId ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.docId}</span>
          ) : null}
        </label>

        <fieldset className="mt-4">
          <legend className="text-foreground-muted text-xs font-medium">
            Escaneo de CURP (opcional)
          </legend>
          <input
            ref={curpFileInputRef}
            type="file"
            accept={PLAYER_CURP_ACCEPT_ATTR}
            disabled={submitting}
            className="border-border bg-background-muted/30 mt-1 w-full cursor-pointer rounded-brand-md border border-dashed px-2 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-brand-blue file:px-2 file:py-1 file:text-xs file:text-white"
            onChange={(e) => onCurpFileChange(e.target.files?.[0] ?? null)}
          />
          <p className="text-foreground-subtle mt-1 text-[10px] leading-relaxed">
            PDF, JPG, PNG o WebP · máx.{" "}
            {Math.round(PLAYER_CURP_MAX_FILE_BYTES / (1024 * 1024))} MB
          </p>
          {curpFileError ? (
            <span className="text-brand-purple mt-1 block text-xs">{curpFileError}</span>
          ) : null}
          {curpFile ? (
            <p className="text-foreground-muted mt-1 truncate text-[11px]">
              Archivo: <span className="text-foreground font-medium">{curpFile.name}</span>
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
            {Math.round(PLAYER_PHOTO_MAX_FILE_BYTES / (1024 * 1024))} MB.
          </p>
          {photoError ? (
            <span className="text-brand-purple mt-1 block text-xs">{photoError}</span>
          ) : null}
          {displayPhotoUrl ? (
            <div className="border-border mt-2 flex justify-center rounded-brand-md border bg-surface-code/20 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayPhotoUrl}
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
              if (!isEdit) {
                resetForm();
              }
              props.onClose();
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
            {submitting
              ? isEdit
                ? "Guardando cambios…"
                : "Guardando…"
              : isEdit
                ? "Guardar cambios"
                : "Guardar jugador"}
          </button>
        </div>
      </form>
    </div>
  );
}
