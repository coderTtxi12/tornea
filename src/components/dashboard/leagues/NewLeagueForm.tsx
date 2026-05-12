"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_WHATSAPP_COUNTRY_ISO2,
  flagEmojiFromIso2,
  getCountryDialOptions,
} from "@/lib/phone/country-dial-options";

import {
  LEAGUE_SHIELD_ACCEPT_ATTR,
  LEAGUE_SHIELD_MAX_FILE_BYTES,
  LEAGUE_SHIELD_MIME_TYPES,
} from "./league-shield-constraints";
import { newLeagueTextFieldsSchema } from "./new-league-form-schema";

type NewLeagueFormProps = {
  /** Vuelve al panel inicial (hero) o cierra el drawer. */
  onCancel: () => void;
  /** Tras crear la liga correctamente (refetch del dashboard). */
  onLeagueCreated?: () => void;
  /** En panel lateral: oculta el título duplicado (el drawer ya lo muestra). */
  variant?: "standalone" | "drawer";
};

export function NewLeagueForm({
  onCancel,
  onLeagueCreated,
  variant = "standalone",
}: NewLeagueFormProps) {
  const idempotencyKeyRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countryDialOptions = useMemo(() => getCountryDialOptions(), []);

  const [leagueName, setLeagueName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactCountryIso, setContactCountryIso] = useState(DEFAULT_WHATSAPP_COUNTRY_ISO2);
  const [contactPhoneNational, setContactPhoneNational] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [organizationAddress, setOrganizationAddress] = useState("");
  const [shield, setShield] = useState<File | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [shieldError, setShieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const shieldPreviewUrl = useMemo(() => {
    if (!shield) return null;
    return URL.createObjectURL(shield);
  }, [shield]);

  useEffect(() => {
    if (!shieldPreviewUrl) return undefined;
    return () => {
      URL.revokeObjectURL(shieldPreviewUrl);
    };
  }, [shieldPreviewUrl]);

  function resetForm() {
    setLeagueName("");
    setContactName("");
    setContactCountryIso(DEFAULT_WHATSAPP_COUNTRY_ISO2);
    setContactPhoneNational("");
    setContactEmail("");
    setOrganizationAddress("");
    setShield(null);
    setFieldErrors({});
    setShieldError(null);
    setSubmitError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onShieldChange(file: File | null) {
    setShieldError(null);
    if (!file) {
      setShield(null);
      return;
    }
    if (!LEAGUE_SHIELD_MIME_TYPES.has(file.type)) {
      setShield(null);
      setShieldError("Usa JPG, PNG o WebP.");
      return;
    }
    if (file.size > LEAGUE_SHIELD_MAX_FILE_BYTES) {
      setShield(null);
      setShieldError(
        `La imagen supera ${Math.round(LEAGUE_SHIELD_MAX_FILE_BYTES / (1024 * 1024))} MB.`,
      );
      return;
    }
    setShield(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setShieldError(null);
    setSubmitError(null);

    const parsed = newLeagueTextFieldsSchema.safeParse({
      leagueName,
      contactName,
      contactCountryIso,
      contactPhoneNational,
      contactEmail,
      organizationAddress,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && next[key] === undefined) {
          next[key] = issue.message;
        }
      }
      setFieldErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      }

      const fd = new FormData();
      fd.set("leagueName", parsed.data.leagueName);
      fd.set("contactName", parsed.data.contactName);
      fd.set("contactCountryIso", parsed.data.contactCountryIso);
      fd.set("contactPhoneNational", parsed.data.contactPhoneNational);
      fd.set("contactEmail", parsed.data.contactEmail);
      fd.set("organizationAddress", parsed.data.organizationAddress);
      if (shield) {
        fd.set("shield", shield);
      }

      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKeyRef.current },
        body: fd,
      });

      let data: {
        error?: string;
        fields?: Record<string, string>;
        league?: unknown;
      } = {};
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
          typeof data.error === "string" ? data.error : "No se pudo crear la liga. Intenta de nuevo.",
        );
        return;
      }

      onLeagueCreated?.();
      resetForm();
      onCancel();
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    resetForm();
    onCancel();
  }

  const containerWidth = variant === "drawer" ? "w-full" : "w-full max-w-xl";

  return (
    <div className={containerWidth}>
      {variant === "standalone" ? (
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight">Nueva liga</h2>
          <p className="text-foreground-muted mt-1 text-sm leading-relaxed">
            Los datos se guardan en tu cuenta. Puedes repetir el envío con seguridad: si la red falla, no
            se duplica la liga.
          </p>
        </div>
      ) : (
        <p className="text-foreground-muted mb-6 text-sm leading-relaxed">
          Los datos se guardan en tu cuenta. Reintentos con la misma sesión no duplican la liga gracias
          al header Idempotency-Key.
        </p>
      )}

      <form className="flex flex-col" onSubmit={handleSubmit}>
        {submitError ? (
          <div className="border-border bg-brand-purple/15 text-brand-navy mb-6 rounded-brand-md border px-3 py-2.5 text-sm">
            {submitError}
          </div>
        ) : null}

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Nombre de la liga</span>
          <input
            type="text"
            name="leagueName"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            autoComplete="organization"
            className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
            aria-invalid={!!fieldErrors.leagueName}
          />
          {fieldErrors.leagueName ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.leagueName}</span>
          ) : null}
        </label>

        <fieldset className="mt-4">
          <legend className="text-foreground-muted text-xs font-medium">Escudo (opcional)</legend>
          <input
            ref={fileInputRef}
            type="file"
            accept={LEAGUE_SHIELD_ACCEPT_ATTR}
            disabled={submitting}
            className="border-border bg-background-muted/30 mt-1 w-full cursor-pointer rounded-brand-md border border-dashed px-2 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-brand-blue file:px-2 file:py-1 file:text-xs file:text-white"
            onChange={(e) => onShieldChange(e.target.files?.[0] ?? null)}
          />
          <p className="text-foreground-subtle mt-1 text-[10px] leading-relaxed">
            JPG, PNG o WebP · máx. {Math.round(LEAGUE_SHIELD_MAX_FILE_BYTES / (1024 * 1024))} MB
          </p>
          {shieldError ? (
            <span className="text-brand-purple mt-1 block text-xs">{shieldError}</span>
          ) : null}
          {shieldPreviewUrl ? (
            <div className="border-border mt-2 flex justify-center rounded-brand-md border bg-surface-code/20 p-3">
              <img
                src={shieldPreviewUrl}
                alt="Vista previa del escudo"
                className="max-h-24 max-w-24 object-contain"
              />
            </div>
          ) : null}
        </fieldset>

        <label className="mt-4 block">
          <span className="text-foreground-muted text-xs font-medium">Contacto principal</span>
          <input
            type="text"
            name="contactName"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            autoComplete="name"
            className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
            aria-invalid={!!fieldErrors.contactName}
          />
          {fieldErrors.contactName ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.contactName}</span>
          ) : null}
        </label>

        <div className="mt-4">
          <span className="text-foreground-muted text-xs font-medium">Celular del contacto</span>
          <p className="text-foreground-subtle mt-0.5 text-[11px] leading-snug">
            Elige el país y escribe solo el número local (igual que en la solicitud de acceso).
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <label className="sr-only" htmlFor="new-league-phone-country">
              País y lada
            </label>
            <div className="relative w-full min-w-0 shrink-0 sm:max-w-[min(100%,16rem)]">
              <select
                id="new-league-phone-country"
                aria-label="País y código de llamada"
                value={contactCountryIso}
                onChange={(e) => {
                  setContactCountryIso(e.target.value);
                  setContactPhoneNational("");
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.contactPhoneNational;
                    delete next.contactCountryIso;
                    return next;
                  });
                }}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 appearance-none py-2.5 pr-9 pl-3 max-h-12 min-h-12 w-full rounded-brand-md border text-sm outline-none focus-visible:ring-2"
                aria-invalid={!!fieldErrors.contactCountryIso}
              >
                {countryDialOptions.map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {flagEmojiFromIso2(c.iso2)} {c.nameEs} (+{c.dialDigits})
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
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-70"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
            <label className="min-w-0 flex-1">
              <span className="sr-only">Número local</span>
              <input
                type="tel"
                inputMode="numeric"
                name="contactPhoneNational"
                value={contactPhoneNational}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "");
                  const max = contactCountryIso.toUpperCase() === "MX" ? 10 : 15;
                  setContactPhoneNational(d.slice(0, max));
                }}
                autoComplete="tel-national"
                placeholder={
                  contactCountryIso.toUpperCase() === "MX"
                    ? "Ej. 55 1234 5678"
                    : "Número local"
                }
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 max-h-12 min-h-12 w-full min-w-0 rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                aria-invalid={!!fieldErrors.contactPhoneNational}
              />
            </label>
          </div>
          {fieldErrors.contactCountryIso ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.contactCountryIso}</span>
          ) : null}
          {fieldErrors.contactPhoneNational ? (
            <span className="text-brand-purple mt-1 block text-xs">
              {fieldErrors.contactPhoneNational}
            </span>
          ) : null}
        </div>

        <label className="mt-4 block">
          <span className="text-foreground-muted text-xs font-medium">Correo electrónico</span>
          <input
            type="email"
            name="contactEmail"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            autoComplete="email"
            className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
            aria-invalid={!!fieldErrors.contactEmail}
          />
          {fieldErrors.contactEmail ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.contactEmail}</span>
          ) : null}
        </label>

        <label className="mt-4 block">
          <span className="text-foreground-muted text-xs font-medium">Dirección de la organización</span>
          <textarea
            name="organizationAddress"
            value={organizationAddress}
            onChange={(e) => setOrganizationAddress(e.target.value)}
            rows={3}
            autoComplete="street-address"
            className="border-border bg-surface-code/40 mt-1 w-full resize-y rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
            aria-invalid={!!fieldErrors.organizationAddress}
          />
          {fieldErrors.organizationAddress ? (
            <span className="text-brand-purple mt-1 block text-xs">
              {fieldErrors.organizationAddress}
            </span>
          ) : null}
        </label>

        <div className="border-border mt-8 flex flex-wrap gap-3 border-t pt-6">
          <button
            type="button"
            className="border-border text-foreground-muted hover:text-foreground rounded-full border px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            onClick={handleBack}
            disabled={submitting}
          >
            Volver
          </button>
          <button
            type="submit"
            className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Creando…" : "Crear liga"}
          </button>
        </div>
      </form>
    </div>
  );
}
