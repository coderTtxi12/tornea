"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import {
  DEFAULT_WHATSAPP_COUNTRY_ISO2,
  flagEmojiFromIso2,
  getCountryDialOptions,
  findDialOptionByIso2,
} from "@/lib/phone/country-dial-options";
import { createClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { combineCountryDialAndNationalToE164 } from "@/logic/access-request/whatsapp";

const STEP_COUNT = 4;

type WizardPayload = {
  contactFullName: string;
  whatsappCountryIso: string;
  whatsappNationalNumber: string;
  leaguesManagedCount: number;
  tournamentsSummary: string;
};

const initialPayload = (): WizardPayload => ({
  contactFullName: "",
  whatsappCountryIso: DEFAULT_WHATSAPP_COUNTRY_ISO2,
  whatsappNationalNumber: "",
  leaguesManagedCount: 1,
  tournamentsSummary: "",
});

type AccessRequestWizardProps = {
  alreadySubmitted: boolean;
  userEmail: string;
};

export function AccessRequestWizard({
  alreadySubmitted,
  userEmail,
}: AccessRequestWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [payload, setPayload] = useState(initialPayload);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const countryDialOptions = useMemo(() => getCountryDialOptions(), []);

  const goNext = useCallback(() => {
    setError(null);
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  }, []);

  const goBack = useCallback(() => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  async function handleSignOut() {
    if (!isSupabaseAuthConfigured()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const country = findDialOptionByIso2(payload.whatsappCountryIso);
      const whatsappNumber = country
        ? combineCountryDialAndNationalToE164(
            country.dialDigits,
            payload.whatsappNationalNumber,
          )
        : "";

      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactFullName: payload.contactFullName.trim(),
          whatsappNumber,
          leaguesManagedCount: payload.leaguesManagedCount,
          tournamentsSummary: payload.tournamentsSummary.trim(),
          organizationName: null,
          cityOrRegion: null,
          referralSource: null,
          approximatePlayersCount: null,
          extraNotes: null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar. Intenta de nuevo.");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  function validateCurrent(): boolean {
    switch (step) {
      case 0:
        if (payload.contactFullName.trim().length < 1) {
          setError("Escribe tu nombre.");
          return false;
        }
        return true;
      case 1: {
        const national = payload.whatsappNationalNumber.replace(/\D/g, "");
        if (national.length < 8) {
          setError("Ingresa tu número (sin el prefijo del país).");
          return false;
        }
        const country = findDialOptionByIso2(payload.whatsappCountryIso);
        const e164 = country
          ? combineCountryDialAndNationalToE164(
              country.dialDigits,
              payload.whatsappNationalNumber,
            )
          : "";
        if (e164.replace(/\D/g, "").length < 10) {
          setError("El número completo parece demasiado corto.");
          return false;
        }
        return true;
      }
      case 2:
        if (
          !Number.isFinite(payload.leaguesManagedCount) ||
          payload.leaguesManagedCount < 0
        ) {
          setError("Indica cuántas ligas administras (número igual o mayor a 0).");
          return false;
        }
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  }

  if (alreadySubmitted || done) {
    return (
      <div className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center px-6 py-20">
        <div className="mx-auto w-full max-w-[22rem] space-y-5 text-center sm:max-w-md">
          <h1 className="text-foreground text-[1.375rem] font-semibold leading-snug tracking-tight sm:text-2xl">
            {alreadySubmitted ? "Solicitud recibida" : "¡Listo!"}
          </h1>
          <p className="text-foreground-muted text-[0.9375rem] leading-relaxed">
            {alreadySubmitted
              ? "Ya registramos tu información. El equipo de tornea revisará tu solicitud y te contactará por WhatsApp u otro medio."
              : "Gracias. Revisaremos tus datos y te escribiremos pronto para coordinar acceso al panel."}
          </p>
          {userEmail ? (
            <p className="text-foreground-muted/70 truncate text-xs tabular-nums">
              {userEmail}
            </p>
          ) : null}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="border-border bg-background/60 text-foreground hover:border-foreground/25 hover:bg-foreground/5 rounded-brand-lg border px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / STEP_COUNT) * 100;

  return (
    <div className="bg-background text-foreground relative min-h-dvh px-5 py-10 sm:px-8">
      <div
        className="pointer-events-none absolute inset-0 login-blobs"
        aria-hidden
      >
        <div className="absolute -top-36 left-[15%] size-[min(100vw,420px)] rounded-full bg-brand-blue blur-[118px]" />
        <div className="absolute top-[28%] -right-28 size-[min(90vw,380px)] rounded-full bg-brand-purple blur-[108px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-lg pb-16">
        <div className="border-border bg-foreground/5 mb-8 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-brand-teal h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-foreground-muted mb-2 text-xs font-semibold uppercase tracking-wide">
          Paso {step + 1} de {STEP_COUNT}
        </p>

        {step === 0 && (
          <section className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">
              ¿Cuál es tu nombre?
            </h1>
            <p className="text-foreground-muted text-sm leading-relaxed">
              Así vinculamos tu solicitud contigo cuando la revisemos.
            </p>
            <input
              type="text"
              autoFocus
              value={payload.contactFullName}
              onChange={(e) =>
                setPayload((p) => ({ ...p, contactFullName: e.target.value }))
              }
              placeholder="Nombre y apellido"
              className="border-border bg-background focus:ring-brand-teal/40 w-full rounded-brand-lg border px-4 py-3 text-base outline-none focus:ring-2"
            />
          </section>
        )}

        {step === 1 && (
          <section className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">
              ¿Cuál es tu WhatsApp?
            </h1>
            <p className="text-foreground-muted text-sm leading-relaxed">
              Elige tu país y escribe solo tu número local.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <label className="sr-only" htmlFor="whatsapp-country">
                País y lada
              </label>
              <div className="relative w-full min-w-0 shrink-0 sm:max-w-[min(100%,260px)]">
                <select
                  id="whatsapp-country"
                  aria-label="País y código de llamada"
                  value={payload.whatsappCountryIso}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      whatsappCountryIso: e.target.value,
                    }))
                  }
                  className="border-border bg-background focus:ring-brand-teal/40 appearance-none pr-9 pl-3 max-h-14 min-h-14 w-full rounded-brand-lg border py-3 text-sm outline-none focus:ring-2 sm:text-base"
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
                    width="18"
                    height="18"
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
              <label className="min-w-0 flex-1 space-y-1.5">
                <span className="text-foreground-muted sr-only">
                  Número de teléfono
                </span>
                <input
                  type="tel"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={payload.whatsappNationalNumber}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      whatsappNationalNumber: e.target.value,
                    }))
                  }
                  placeholder="Ej. 246 359 5017"
                  className="border-border bg-background focus:ring-brand-teal/40 w-full min-w-0 rounded-brand-lg border px-4 py-3 text-base outline-none focus:ring-2"
                />
              </label>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">
              ¿Cuántas ligas administras hoy?
            </h1>
            <p className="text-foreground-muted text-sm leading-relaxed">
              Un número aproximado está bien (puede ser 0 si estás por lanzar
              la primera).
            </p>
            <input
              type="number"
              min={0}
              autoFocus
              value={Number.isNaN(payload.leaguesManagedCount) ? "" : payload.leaguesManagedCount}
              onChange={(e) => {
                const v = e.target.value;
                setPayload((p) => ({
                  ...p,
                  leaguesManagedCount:
                    v === "" ? NaN : Math.max(0, Math.floor(Number(v))),
                }));
              }}
              className="border-border bg-background focus:ring-brand-teal/40 w-full rounded-brand-lg border px-4 py-3 text-base outline-none focus:ring-2"
            />
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">
              Torneos y competencias
            </h1>
            <p className="text-foreground-muted text-sm leading-relaxed">
              Opcional. Describe qué organizas (deporte,
              frecuencia, etc.). Puedes saltarlo con Continuar.
            </p>
            <textarea
              autoFocus
              value={payload.tournamentsSummary}
              onChange={(e) =>
                setPayload((p) => ({
                  ...p,
                  tournamentsSummary: e.target.value,
                }))
              }
              rows={5}
              placeholder="Ej. Liga municipal de fútbol 7, dos torneos cortos al año… (puede quedar vacío)"
              className="border-border bg-background focus:ring-brand-teal/40 w-full resize-y rounded-brand-lg border px-4 py-3 text-base outline-none focus:ring-2"
            />
          </section>
        )}

        {error ? (
          <p className="mt-6 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="text-foreground-muted hover:text-foreground rounded-brand-lg px-3 py-2 text-sm font-semibold transition"
              >
                Atrás
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="text-foreground-muted hover:text-foreground rounded-brand-lg px-3 py-2 text-sm font-semibold transition"
              >
                Salir
              </button>
            )}
          </div>
          {step < STEP_COUNT - 1 ? (
            <button
              type="button"
              onClick={() => {
                if (validateCurrent()) goNext();
              }}
              className="bg-brand-teal hover:bg-brand-teal/90 rounded-brand-lg px-6 py-3 text-sm font-bold text-white shadow-[var(--card-shadow)] transition"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                if (validateCurrent()) void handleSubmit();
              }}
              className="bg-brand-teal hover:bg-brand-teal/90 rounded-brand-lg px-6 py-3 text-sm font-bold text-white shadow-[var(--card-shadow)] transition disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Enviar solicitud"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
