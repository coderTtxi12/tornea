"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_WHATSAPP_COUNTRY_ISO2,
  flagEmojiFromIso2,
  getCountryDialOptions,
} from "@/lib/phone/country-dial-options";
import { splitE164ToCountryAndNational } from "@/lib/phone/e164-split";

import type { MyLeaguesApiItem } from "./my-leagues-state";
import {
  LEAGUE_SHIELD_ACCEPT_ATTR,
  LEAGUE_SHIELD_MAX_FILE_BYTES,
  LEAGUE_SHIELD_MIME_TYPES,
} from "./league-shield-constraints";
import { teamStatusEnumSchema } from "./new-team-form-schema";

type NewTeamFormProps = {
  leagues: readonly MyLeaguesApiItem[];
  onClose: () => void;
  onTeamCreated?: () => void;
  onBusyChange?: (busy: boolean) => void;
  /** Modo edición: carga GET y guarda con PATCH */
  editTarget?: { leagueId: string; teamId: string } | null;
};

export function NewTeamForm({
  leagues,
  onClose,
  onTeamCreated,
  onBusyChange,
  editTarget = null,
}: NewTeamFormProps) {
  const isEdit = Boolean(editTarget);
  const countryDialOptions = useMemo(() => getCountryDialOptions(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(() =>
    isEdit ? "loading" : "ready",
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const [leagueId, setLeagueId] = useState(() =>
    !isEdit && leagues.length === 1 ? leagues[0]!.id : "",
  );
  const [leagueCategoryId, setLeagueCategoryId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamStatus, setTeamStatus] = useState<"active" | "inactive" | "withdrawn">("active");

  const [directorName, setDirectorName] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");
  const [directorCountryIso, setDirectorCountryIso] = useState(DEFAULT_WHATSAPP_COUNTRY_ISO2);
  const [directorPhoneNational, setDirectorPhoneNational] = useState("");

  const [additionalName, setAdditionalName] = useState("");
  const [additionalEmail, setAdditionalEmail] = useState("");
  const [additionalCountryIso, setAdditionalCountryIso] = useState(DEFAULT_WHATSAPP_COUNTRY_ISO2);
  const [additionalPhoneNational, setAdditionalPhoneNational] = useState("");

  const [crest, setCrest] = useState<File | null>(null);
  const [crestPreviewUrl, setCrestPreviewUrl] = useState<string | null>(null);
  const [serverCrestUrl, setServerCrestUrl] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [crestError, setCrestError] = useState<string | null>(null);
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
    if (isEdit) return;
    if (leagues.length === 1) {
      queueMicrotask(() => setLeagueId(leagues[0]!.id));
    }
  }, [leagues, isEdit]);

  useEffect(() => {
    if (!editTarget) {
      queueMicrotask(() => {
        setLoadState("ready");
        setLoadError(null);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoadState("loading");
      setLoadError(null);
    });

    void (async () => {
      try {
        const res = await fetch(
          `/api/leagues/${encodeURIComponent(editTarget.leagueId)}/teams/${encodeURIComponent(editTarget.teamId)}`,
        );
        let data: {
          team?: {
            leagueId: string;
            name: string;
            status: string;
            crestUrl: string | null;
          };
          seasonTeam?: { leagueCategoryId: string | null } | null;
          contacts?: {
            director: { fullName: string; email: string | null; whatsappE164: string };
            additional: { fullName: string; email: string | null; whatsappE164: string };
          };
        } = {};
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

        if (!res.ok || !data.team) {
          setLoadError(
            typeof (data as { error?: string }).error === "string"
              ? (data as { error: string }).error
              : "No se pudo cargar el equipo.",
          );
          setLoadState("error");
          return;
        }

        const st = teamStatusEnumSchema.safeParse(data.team.status);
        setTeamStatus(st.success ? st.data : "active");
        setLeagueId(data.team.leagueId);
        setTeamName(data.team.name);
        setServerCrestUrl(data.team.crestUrl);
        setLeagueCategoryId(data.seasonTeam?.leagueCategoryId ?? "");

        const c = data.contacts;
        if (c) {
          setDirectorName(c.director.fullName);
          setDirectorEmail(c.director.email ?? "");
          const dPhone = splitE164ToCountryAndNational(c.director.whatsappE164 || "");
          setDirectorCountryIso(dPhone.iso2);
          setDirectorPhoneNational(dPhone.nationalDigits);
          setAdditionalName(c.additional.fullName);
          setAdditionalEmail(c.additional.email ?? "");
          const aPhone = splitE164ToCountryAndNational(c.additional.whatsappE164 || "");
          setAdditionalCountryIso(aPhone.iso2);
          setAdditionalPhoneNational(aPhone.nationalDigits);
        }

        setLoadState("ready");
      } catch {
        if (!cancelled) {
          setLoadError("Error de red al cargar el equipo.");
          setLoadState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editTarget]);

  const categories = useMemo(() => {
    const L = leagues.find((l) => l.id === leagueId);
    return L?.categories ?? [];
  }, [leagues, leagueId]);

  useEffect(() => {
    if (!leagueCategoryId) return;
    const ok = categories.some((c) => c.id === leagueCategoryId);
    if (!ok) queueMicrotask(() => setLeagueCategoryId(""));
  }, [categories, leagueCategoryId]);

  useEffect(() => {
    if (!crest) {
      queueMicrotask(() => setCrestPreviewUrl(null));
      return undefined;
    }
    const url = URL.createObjectURL(crest);
    queueMicrotask(() => setCrestPreviewUrl(url));
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [crest]);

  function onCrestChange(file: File | null) {
    setCrestError(null);
    if (!file) {
      setCrest(null);
      return;
    }
    if (!LEAGUE_SHIELD_MIME_TYPES.has(file.type)) {
      setCrest(null);
      setCrestError("Usa JPG, PNG o WebP.");
      return;
    }
    if (file.size > LEAGUE_SHIELD_MAX_FILE_BYTES) {
      setCrest(null);
      setCrestError(
        `La imagen supera ${Math.round(LEAGUE_SHIELD_MAX_FILE_BYTES / (1024 * 1024))} MB.`,
      );
      return;
    }
    setCrest(file);
  }

  function resetForm() {
    if (!isEdit) {
      setLeagueId(leagues.length === 1 ? leagues[0]!.id : "");
    }
    setLeagueCategoryId("");
    setTeamName("");
    setTeamStatus("active");
    setDirectorName("");
    setDirectorEmail("");
    setDirectorCountryIso(DEFAULT_WHATSAPP_COUNTRY_ISO2);
    setDirectorPhoneNational("");
    setAdditionalName("");
    setAdditionalEmail("");
    setAdditionalCountryIso(DEFAULT_WHATSAPP_COUNTRY_ISO2);
    setAdditionalPhoneNational("");
    setCrest(null);
    setServerCrestUrl(null);
    setFieldErrors({});
    setCrestError(null);
    setSubmitError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setCrestError(null);
    setSubmitError(null);

    if (!leagueId) {
      setFieldErrors({ leagueId: "Seleccioná una liga." });
      return;
    }

    const fd = new FormData();
    fd.set("teamName", teamName);
    fd.set("leagueCategoryId", leagueCategoryId);
    fd.set("directorName", directorName);
    fd.set("directorEmail", directorEmail);
    fd.set("directorCountryIso", directorCountryIso);
    fd.set("directorPhoneNational", directorPhoneNational);
    fd.set("additionalName", additionalName);
    fd.set("additionalEmail", additionalEmail);
    fd.set("additionalCountryIso", additionalCountryIso);
    fd.set("additionalPhoneNational", additionalPhoneNational);
    if (isEdit) {
      fd.set("teamStatus", teamStatus);
    }
    if (crest) fd.set("crest", crest);

    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/leagues/${encodeURIComponent(editTarget!.leagueId)}/teams/${encodeURIComponent(editTarget!.teamId)}`
        : `/api/leagues/${encodeURIComponent(leagueId)}/teams`;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
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
          typeof data.error === "string"
            ? data.error
            : isEdit
              ? "No se pudo guardar el equipo. Intentá de nuevo."
              : "No se pudo registrar el equipo. Intentá de nuevo.",
        );
        return;
      }

      onTeamCreated?.();
      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const selectedLeagueName = leagues.find((l) => l.id === leagueId)?.name ?? "";

  if (loadState === "loading") {
    return (
      <div className="w-full">
        <p className="text-foreground-muted text-sm">Cargando datos del equipo…</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="w-full space-y-4">
        <div className="border-border bg-brand-purple/15 text-brand-navy rounded-brand-md border px-3 py-2.5 text-sm">
          {loadError ?? "No se pudo cargar el equipo."}
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
        {isEdit ? (
          <>
            Editá los datos del equipo en <span className="text-foreground font-medium">teams</span> y la
            inscripción en <span className="text-foreground font-medium">season_teams</span>. La liga no se
            puede cambiar desde acá.
          </>
        ) : (
          <>
            El equipo se guarda en <span className="text-foreground font-medium">teams</span> y la
            inscripción con categoría en <span className="text-foreground font-medium">season_teams</span>
            . Los contactos van en <span className="text-foreground font-medium">metadata</span> de la
            inscripción.
          </>
        )}
      </p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {submitError ? (
          <div className="border-border bg-brand-purple/15 text-brand-navy rounded-brand-md border px-3 py-2.5 text-sm">
            {submitError}
          </div>
        ) : null}

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Liga</span>
          <div className="relative mt-1">
            <select
              name="leagueId"
              value={leagueId}
              onChange={(e) => {
                setLeagueId(e.target.value);
                setLeagueCategoryId("");
              }}
              required
              disabled={isEdit}
              className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 w-full appearance-none rounded-brand-md border py-2.5 pr-9 pl-3 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
              aria-invalid={!!fieldErrors.leagueId}
            >
              <option value="" disabled>
                Seleccioná liguilla
              </option>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          {fieldErrors.leagueId ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.leagueId}</span>
          ) : null}
        </label>

        {leagueId ? (
          <label className="block">
            <span className="text-foreground-muted text-xs font-medium">Categoría</span>
            <div className="relative mt-1">
              <select
                name="leagueCategoryId"
                value={leagueCategoryId}
                onChange={(e) => setLeagueCategoryId(e.target.value)}
                required
                disabled={categories.length === 0}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 w-full appearance-none rounded-brand-md border py-2.5 pr-9 pl-3 text-sm outline-none focus-visible:ring-2 disabled:opacity-60"
                aria-invalid={!!fieldErrors.leagueCategoryId}
              >
                <option value="" disabled>
                  {categories.length === 0 ? "Sin categorías — creá una primero" : "Seleccioná categoría"}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span
                className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                aria-hidden
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            {fieldErrors.leagueCategoryId ? (
              <span className="text-brand-purple mt-1 block text-xs">
                {fieldErrors.leagueCategoryId}
              </span>
            ) : null}
          </label>
        ) : null}

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Nombre del equipo</span>
          <input
            type="text"
            name="teamName"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            autoComplete="off"
            className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
            aria-invalid={!!fieldErrors.teamName}
          />
          {fieldErrors.teamName ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.teamName}</span>
          ) : null}
        </label>

        {isEdit ? (
          <label className="block">
            <span className="text-foreground-muted text-xs font-medium">Estado del equipo</span>
            <div className="relative mt-1">
              <select
                name="teamStatus"
                value={teamStatus}
                onChange={(e) =>
                  setTeamStatus(e.target.value as "active" | "inactive" | "withdrawn")
                }
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 w-full appearance-none rounded-brand-md border py-2.5 pr-9 pl-3 text-sm outline-none focus-visible:ring-2"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="withdrawn">Retirado</option>
              </select>
              <span
                className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                aria-hidden
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            {fieldErrors.teamStatus ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.teamStatus}</span>
            ) : null}
          </label>
        ) : null}

        <fieldset className="border-border rounded-brand-md border p-3">
          <legend className="text-foreground-muted px-1 text-xs font-medium">Dirigente</legend>
          <label className="mt-1 block">
            <span className="text-foreground-muted text-[11px] font-medium">Nombre completo</span>
            <input
              type="text"
              value={directorName}
              onChange={(e) => setDirectorName(e.target.value)}
              required
              className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
              aria-invalid={!!fieldErrors.directorName}
            />
            {fieldErrors.directorName ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.directorName}</span>
            ) : null}
          </label>
          <label className="mt-3 block">
            <span className="text-foreground-muted text-[11px] font-medium">
              Correo (opcional)
            </span>
            <input
              type="email"
              value={directorEmail}
              onChange={(e) => setDirectorEmail(e.target.value)}
              className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
              aria-invalid={!!fieldErrors.directorEmail}
            />
            {fieldErrors.directorEmail ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.directorEmail}</span>
            ) : null}
          </label>
          <div className="mt-3">
            <span className="text-foreground-muted text-[11px] font-medium">WhatsApp del dirigente</span>
            <p className="text-foreground-subtle mt-0.5 text-[10px] leading-snug">
              Lada por país (México por defecto, igual que al crear una liga). Solo número local abajo.
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="relative w-full min-w-0 shrink-0 sm:max-w-[min(100%,16rem)]">
                <select
                  aria-label="País y código dirigente"
                  value={directorCountryIso}
                  onChange={(e) => {
                    setDirectorCountryIso(e.target.value);
                    setDirectorPhoneNational("");
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                value={directorPhoneNational}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "");
                  const max = directorCountryIso.toUpperCase() === "MX" ? 10 : 15;
                  setDirectorPhoneNational(d.slice(0, max));
                }}
                required
                placeholder={directorCountryIso.toUpperCase() === "MX" ? "10 dígitos" : "Número local"}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 max-h-12 min-h-12 min-w-0 flex-1 rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                aria-invalid={!!fieldErrors.directorPhoneNational}
              />
            </div>
            {fieldErrors.directorCountryIso ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.directorCountryIso}</span>
            ) : null}
            {fieldErrors.directorPhoneNational ? (
              <span className="text-brand-purple mt-1 block text-xs">
                {fieldErrors.directorPhoneNational}
              </span>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="border-border rounded-brand-md border p-3">
          <legend className="text-foreground-muted px-1 text-xs font-medium">Contacto adicional</legend>
          <label className="mt-1 block">
            <span className="text-foreground-muted text-[11px] font-medium">Nombre completo</span>
            <input
              type="text"
              value={additionalName}
              onChange={(e) => setAdditionalName(e.target.value)}
              required
              className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
              aria-invalid={!!fieldErrors.additionalName}
            />
            {fieldErrors.additionalName ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.additionalName}</span>
            ) : null}
          </label>
          <label className="mt-3 block">
            <span className="text-foreground-muted text-[11px] font-medium">
              Correo (opcional)
            </span>
            <input
              type="email"
              value={additionalEmail}
              onChange={(e) => setAdditionalEmail(e.target.value)}
              className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
              aria-invalid={!!fieldErrors.additionalEmail}
            />
            {fieldErrors.additionalEmail ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.additionalEmail}</span>
            ) : null}
          </label>
          <div className="mt-3">
            <span className="text-foreground-muted text-[11px] font-medium">WhatsApp (obligatorio)</span>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="relative w-full min-w-0 shrink-0 sm:max-w-[min(100%,16rem)]">
                <select
                  aria-label="País y código contacto adicional"
                  value={additionalCountryIso}
                  onChange={(e) => {
                    setAdditionalCountryIso(e.target.value);
                    setAdditionalPhoneNational("");
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                value={additionalPhoneNational}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "");
                  const max = additionalCountryIso.toUpperCase() === "MX" ? 10 : 15;
                  setAdditionalPhoneNational(d.slice(0, max));
                }}
                required
                placeholder={additionalCountryIso.toUpperCase() === "MX" ? "10 dígitos" : "Número local"}
                className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 max-h-12 min-h-12 min-w-0 flex-1 rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                aria-invalid={!!fieldErrors.additionalPhoneNational}
              />
            </div>
            {fieldErrors.additionalCountryIso ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.additionalCountryIso}</span>
            ) : null}
            {fieldErrors.additionalPhoneNational ? (
              <span className="text-brand-purple mt-1 block text-xs">
                {fieldErrors.additionalPhoneNational}
              </span>
            ) : null}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-foreground-muted text-xs font-medium">Escudo del club (opcional)</legend>
          {serverCrestUrl && !crestPreviewUrl ? (
            <div className="border-border mt-1 mb-2 rounded-brand-md border bg-surface-code/20 p-3">
              <p className="text-foreground-subtle mb-2 text-[10px] font-medium uppercase tracking-wide">
                Escudo actual
              </p>
              <div className="flex justify-center">
                <img
                  key={serverCrestUrl}
                  src={serverCrestUrl}
                  alt="Escudo del club"
                  className="max-h-24 max-w-24 object-contain"
                  referrerPolicy="no-referrer"
                  decoding="async"
                />
              </div>
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept={LEAGUE_SHIELD_ACCEPT_ATTR}
            disabled={submitting}
            className="border-border bg-background-muted/30 mt-1 w-full cursor-pointer rounded-brand-md border border-dashed px-2 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-brand-blue file:px-2 file:py-1 file:text-xs file:text-white"
            onChange={(e) => onCrestChange(e.target.files?.[0] ?? null)}
          />
          <p className="text-foreground-subtle mt-1 text-[10px] leading-relaxed">
            JPG, PNG o WebP · máx. {Math.round(LEAGUE_SHIELD_MAX_FILE_BYTES / (1024 * 1024))} MB
          </p>
          {crestError ? (
            <span className="text-brand-purple mt-1 block text-xs">{crestError}</span>
          ) : null}
          {crestPreviewUrl ? (
            <div className="border-border mt-2 flex justify-center rounded-brand-md border bg-surface-code/20 p-3">
              <img src={crestPreviewUrl} alt="Vista previa del escudo" className="max-h-24 max-w-24 object-contain" />
            </div>
          ) : null}
        </fieldset>

        {leagueId ? (
          <p className="text-foreground-subtle text-[11px]">
            Liga seleccionada: <span className="text-foreground font-medium">{selectedLeagueName}</span>
          </p>
        ) : null}

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
            Volver
          </button>
          <button
            type="submit"
            className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            disabled={submitting || !leagueId || categories.length === 0}
          >
            {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar equipo"}
          </button>
        </div>
      </form>
    </div>
  );
}
