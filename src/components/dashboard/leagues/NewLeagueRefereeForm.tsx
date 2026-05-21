"use client";

import { useEffect, useRef, useState } from "react";

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
import { parseNewLeagueRefereeForm } from "./new-league-referee-form-schema";
import type { MyLeaguesApiItem } from "./my-leagues-state";

type NewLeagueRefereeFormProps = {
  leagues: readonly MyLeaguesApiItem[];
  onClose: () => void;
  onRefereeCreated?: () => void;
  onBusyChange?: (busy: boolean) => void;
};

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function NewLeagueRefereeForm({
  leagues,
  onClose,
  onRefereeCreated,
  onBusyChange,
}: NewLeagueRefereeFormProps) {
  const countryDialOptions = getCountryDialOptions();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const curpInputRef = useRef<HTMLInputElement>(null);

  const [leagueId, setLeagueId] = useState(() => (leagues.length === 1 ? leagues[0]!.id : ""));
  const [fullName, setFullName] = useState("");
  const [whatsappCountryIso, setWhatsappCountryIso] = useState(DEFAULT_WHATSAPP_COUNTRY_ISO2);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [curp, setCurp] = useState<File | null>(null);
  const [curpError, setCurpError] = useState<string | null>(null);

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
    queueMicrotask(() => {
      if (leagues.length === 1) {
        setLeagueId((prev) => (prev === leagues[0]!.id ? prev : leagues[0]!.id));
        return;
      }
      if (leagues.length === 0) {
        setLeagueId("");
        return;
      }
      setLeagueId((prev) => (prev && leagues.some((l) => l.id === prev) ? prev : ""));
    });
  }, [leagues]);

  function resetForm() {
    setFullName("");
    setWhatsappCountryIso(DEFAULT_WHATSAPP_COUNTRY_ISO2);
    setWhatsappPhone("");
    setEmail("");
    setNotes("");
    setPhoto(null);
    setPhotoError(null);
    setCurp(null);
    setCurpError(null);
    setFieldErrors({});
    setSubmitError(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (curpInputRef.current) curpInputRef.current.value = "";
  }

  function onPhotoChange(file: File | null) {
    setPhotoError(null);
    if (!file) {
      setPhoto(null);
      return;
    }
    if (file.size > PLAYER_PHOTO_MAX_FILE_BYTES) {
      setPhotoError(`La foto no puede superar ${Math.round(PLAYER_PHOTO_MAX_FILE_BYTES / (1024 * 1024))} MB.`);
      setPhoto(null);
      return;
    }
    if (!PLAYER_PHOTO_MIME_TYPES.has(file.type)) {
      setPhotoError("La foto debe ser JPG, PNG o WebP.");
      setPhoto(null);
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
    if (file.size > PLAYER_CURP_MAX_FILE_BYTES) {
      setCurpError(
        `El archivo no puede superar ${Math.round(PLAYER_CURP_MAX_FILE_BYTES / (1024 * 1024))} MB.`,
      );
      setCurp(null);
      return;
    }
    if (!PLAYER_CURP_MIME_TYPES.has(file.type)) {
      setCurpError("La CURP debe ser PDF, JPG, PNG o WebP.");
      setCurp(null);
      return;
    }
    setCurp(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);
    setPhotoError(null);
    setCurpError(null);

    if (!leagueId) {
      setFieldErrors({ leagueId: "Elegí una liga." });
      return;
    }

    const parsed = parseNewLeagueRefereeForm({
      leagueId,
      fullName,
      whatsappCountryIso,
      whatsappPhoneNational: whatsappPhone,
      email,
      notes,
    });
    if (!parsed.ok) {
      setFieldErrors(parsed.fields);
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("fullName", parsed.data.fullName);
      fd.set("whatsappCountryIso", whatsappCountryIso);
      fd.set("whatsappPhoneNational", whatsappPhone);
      if (parsed.data.email) fd.set("email", parsed.data.email);
      else fd.set("email", "");
      fd.set("notes", parsed.data.notes ?? "");
      if (photo) fd.set("photo", photo);
      if (curp) fd.set("curp", curp);

      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/referees`, {
        method: "POST",
        body: fd,
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
          typeof data.error === "string" ? data.error : "No se pudo guardar el árbitro.",
        );
        return;
      }

      onRefereeCreated?.();
      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <p className="text-foreground-muted mb-6 text-sm leading-relaxed">
        Directorio de contacto en <code className="text-foreground-muted text-xs">league_referees</code>
        . Podés asignarlos a partidos más adelante desde el detalle del encuentro.
      </p>

      <form className="flex flex-col gap-4" onSubmit={(ev) => void handleSubmit(ev)}>
        {submitError ? (
          <div className="border-border bg-brand-purple/15 text-brand-navy rounded-brand-md border px-3 py-2.5 text-sm">
            {submitError}
          </div>
        ) : null}

        {leagues.length === 0 ? (
          <p className="text-foreground-muted text-sm leading-relaxed">
            No tenés ligas en las que podés gestionar árbitros. Creá una liga primero.
          </p>
        ) : (
          <label className="block">
            <span className="text-foreground-muted text-xs font-medium">
              Liga <span className="text-brand-purple">*</span>
            </span>
            <div className="relative mt-1">
              <select
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
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
              <span className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2">
                <ChevronDownIcon />
              </span>
            </div>
            {fieldErrors.leagueId ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.leagueId}</span>
            ) : null}
          </label>
        )}

        <fieldset
          disabled={leagues.length === 0}
          className="contents min-w-0 disabled:pointer-events-none disabled:opacity-50"
        >
          <label className="block">
            <span className="text-foreground-muted text-xs font-medium">Nombre completo</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
              aria-invalid={!!fieldErrors.fullName}
            />
            {fieldErrors.fullName ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.fullName}</span>
            ) : null}
          </label>

        <fieldset className="border-border rounded-brand-md border p-3">
          <legend className="text-foreground-muted px-1 text-xs font-medium">WhatsApp</legend>
          <p className="text-foreground-subtle mt-0.5 text-[10px] leading-snug">
            Lada por país (México por defecto). Número local en el segundo campo.
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
              placeholder={whatsappCountryIso.toUpperCase() === "MX" ? "10 dígitos" : "Número local"}
              disabled={submitting}
              className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 max-h-12 min-h-12 min-w-0 flex-1 rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
              aria-invalid={!!fieldErrors.whatsappPhoneNational}
            />
          </div>
          {fieldErrors.whatsappPhoneNational ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.whatsappPhoneNational}</span>
          ) : null}
        </fieldset>

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Correo (opcional)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
            aria-invalid={!!fieldErrors.email}
          />
          {fieldErrors.email ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.email}</span>
          ) : null}
        </label>

        <fieldset>
          <legend className="text-foreground-muted text-xs font-medium">CURP (opcional)</legend>
          <p className="text-foreground-subtle mt-0.5 text-[10px] leading-snug">
            Subí foto o escaneo (PDF, JPG, PNG o WebP). No se captura el texto de la CURP en el formulario.
          </p>
          <input
            ref={curpInputRef}
            type="file"
            accept={PLAYER_CURP_ACCEPT_ATTR}
            disabled={submitting}
            className="border-border bg-background-muted/30 mt-1 w-full cursor-pointer rounded-brand-md border border-dashed px-2 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-brand-blue file:px-2 file:py-1 file:text-xs file:text-white"
            onChange={(e) => onCurpChange(e.target.files?.[0] ?? null)}
          />
          <p className="text-foreground-subtle mt-1 text-[10px] leading-relaxed">
            Máx. {Math.round(PLAYER_CURP_MAX_FILE_BYTES / (1024 * 1024))} MB · misma política que jugadores.
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
          <legend className="text-foreground-muted text-xs font-medium">Foto (opcional)</legend>
          <input
            ref={photoInputRef}
            type="file"
            accept={PLAYER_PHOTO_ACCEPT_ATTR}
            disabled={submitting}
            className="border-border bg-background-muted/30 mt-1 w-full cursor-pointer rounded-brand-md border border-dashed px-2 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-brand-blue file:px-2 file:py-1 file:text-xs file:text-white"
            onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
          />
          <p className="text-foreground-subtle mt-1 text-[10px] leading-relaxed">
            JPG, PNG o WebP · máx. {Math.round(PLAYER_PHOTO_MAX_FILE_BYTES / (1024 * 1024))} MB
          </p>
          {photoError ? (
            <span className="text-brand-purple mt-1 block text-xs">{photoError}</span>
          ) : null}
          {photo ? (
            <p className="text-foreground-muted mt-1 truncate text-[11px]">
              Archivo: <span className="text-foreground font-medium">{photo.name}</span>
            </p>
          ) : null}
        </fieldset>

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Notas extra (opcional)</span>
          <textarea
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
            disabled={submitting || !leagueId}
          >
            {submitting ? "Guardando…" : "Guardar árbitro"}
          </button>
        </div>
      </form>
    </div>
  );
}
