"use client";

import { useMemo, type ReactNode } from "react";
import { Check, MapPin } from "lucide-react";

import {
  BIRTH_DATE_MIN_ISO,
  birthDateMaxIso,
} from "@/logic/players/birth-date-validation";

import { LiveFormField } from "./live-form-field";
import { LiveInput } from "./live-form-controls";
import { formatMatchSchedule } from "./live-match-format";
import { LIVE_PANEL_CLASS } from "./live-field-styles";

export function LivePanelShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-brand-lg border ${LIVE_PANEL_CLASS} ${className}`}
    >
      {children}
    </div>
  );
}

export function LiveSectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-border flex flex-wrap items-start justify-between gap-3 border-b bg-background px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon ? (
            <span className="bg-brand-teal/10 text-brand-teal flex size-8 shrink-0 items-center justify-center rounded-full">
              {icon}
            </span>
          ) : null}
          <h3 className="text-[0.95rem] font-semibold tracking-tight">{title}</h3>
        </div>
        {description ? (
          <p className="text-foreground-muted mt-1 max-w-xl text-xs leading-relaxed sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function LiveSectionBody({ children }: { children: ReactNode }) {
  return <div className="p-4 sm:p-5">{children}</div>;
}

/** Scrim + spinner sobre una `LiveCard` (p. ej. guardar datos, reloj, incidencia). */
export function LiveCardBusyOverlay({
  label,
  rounded = "lg",
}: {
  label: string;
  rounded?: "lg" | "bottom";
}) {
  const roundedClass =
    rounded === "bottom" ? "rounded-b-brand-lg" : "rounded-brand-lg";
  return (
    <div
      className={`absolute inset-0 z-20 flex cursor-wait items-center justify-center bg-background/72 backdrop-blur-[2px] ${roundedClass}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="border-border bg-background/95 flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-bold text-foreground shadow-lg">
        <span
          className="border-brand-teal size-4 animate-spin rounded-full border-2 border-t-transparent"
          aria-hidden
        />
        {label}
      </div>
    </div>
  );
}

const STEPS = [
  { key: "setup", label: "Datos" },
  { key: "lineups", label: "Plantilla" },
  { key: "live", label: "En vivo" },
] as const;

export function LivePhaseStepper({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="border-border border-t bg-background px-4 py-4 sm:px-6">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          const last = i === STEPS.length - 1;
          return (
            <li key={step.key} className={`flex flex-1 items-center ${last ? "" : ""}`}>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors duration-200 ${
                    done
                      ? "bg-brand-teal text-brand-navy"
                      : active
                        ? "bg-brand-lime text-brand-navy ring-4 ring-brand-lime/25"
                        : "border-border bg-background-muted text-foreground-muted border"
                  }`}
                >
                  {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide ${
                    active ? "text-brand-lime" : done ? "text-brand-teal" : "text-foreground-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!last ? (
                <div
                  className={`mx-1 mb-5 h-0.5 flex-1 rounded-full transition-colors duration-200 ${
                    i < activeIndex ? "bg-brand-teal/60" : "bg-border"
                  }`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Marcador compacto del partido activo */
export function LiveMatchHeader({
  homeName,
  awayName,
  homeScore,
  awayScore,
  venueName,
  categoryName,
  scheduledAt,
  statusBadge,
  clockLabel,
}: {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  venueName: string | null;
  categoryName?: string | null;
  scheduledAt?: string | null;
  statusBadge: ReactNode;
  clockLabel?: string | null;
}) {
  const scheduleLabel = scheduledAt ? formatMatchSchedule(scheduledAt) : null;
  return (
    <div className={`overflow-hidden rounded-brand-lg border ${LIVE_PANEL_CLASS}`}>
      <div className="relative px-4 py-4 sm:px-5">
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge}
            {clockLabel ? (
              <span className="text-foreground-muted rounded-full border border-border bg-background-muted/45 px-2.5 py-1 text-xs font-medium tabular-nums">
                {clockLabel}
              </span>
            ) : null}
          </div>
          {categoryName || scheduleLabel ? (
            <div className="min-w-0 text-right text-[11px] leading-relaxed sm:text-xs">
              {categoryName ? (
                <p className="text-brand-teal font-semibold">{categoryName}</p>
              ) : null}
              {scheduleLabel ? (
                <p className="text-foreground-muted tabular-nums">{scheduleLabel}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="relative mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-center">
          <div className="min-w-0 text-left">
            <p className="truncate text-base font-semibold leading-tight sm:text-lg">{homeName}</p>
            <p className="text-brand-teal/80 mt-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Local
            </p>
          </div>
          <div className="rounded-brand-lg border border-border bg-background-muted/30 px-3 py-2">
            <p className="text-3xl font-black tabular-nums tracking-tight sm:text-4xl">
              <span className="text-brand-lime">{homeScore}</span>
              <span className="text-foreground-muted mx-1.5 font-semibold">–</span>
              <span className="text-brand-lime">{awayScore}</span>
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="truncate text-base font-semibold leading-tight sm:text-lg">{awayName}</p>
            <p className="text-brand-teal/80 mt-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Visitante
            </p>
          </div>
        </div>
        {venueName ? (
          <p className="text-foreground-muted relative mt-3 flex items-center justify-center gap-1.5 text-xs">
            <MapPin className="text-brand-teal size-3.5 shrink-0" aria-hidden />
            {venueName}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SlotToggleGroup({
  starterActive,
  benchActive,
  onStarter,
  onBench,
}: {
  starterActive: boolean;
  benchActive: boolean;
  onStarter: () => void;
  onBench: () => void;
}) {
  return (
    <span
      className="border-border bg-background-muted/50 inline-flex shrink-0 overflow-hidden rounded-brand-sm border p-0.5"
      role="group"
      aria-label="Titular o suplente"
    >
      <button
        type="button"
        onClick={onStarter}
        className={`cursor-pointer rounded-[0.4rem] px-2.5 py-1 text-[10px] font-bold uppercase transition-colors duration-200 ${
          starterActive
            ? "bg-brand-lime text-brand-navy shadow-sm"
            : "text-foreground-muted hover:text-foreground"
        }`}
      >
        T
      </button>
      <button
        type="button"
        onClick={onBench}
        className={`cursor-pointer rounded-[0.4rem] px-2.5 py-1 text-[10px] font-bold uppercase transition-colors duration-200 ${
          benchActive
            ? "bg-brand-teal/25 text-brand-teal"
            : "text-foreground-muted hover:text-foreground"
        }`}
      >
        S
      </button>
    </span>
  );
}

export function LiveAlert({
  tone,
  children,
}: {
  tone: "warn" | "error";
  children: ReactNode;
}) {
  const styles =
    tone === "warn"
      ? "border-brand-purple/35 bg-brand-purple/10"
      : "border-destructive/40 bg-destructive/10";
  return (
    <div className={`rounded-brand-lg border px-4 py-3 text-sm ${styles}`}>{children}</div>
  );
}

export function LiveBirthDateField({
  id = "live-birth-date",
  value,
  onChange,
  error,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const max = useMemo(() => birthDateMaxIso(), []);

  return (
    <LiveFormField label="Fecha de nacimiento" htmlFor={id} error={error}>
      <LiveInput
        id={id}
        type="date"
        name="birthDate"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={BIRTH_DATE_MIN_ISO}
        max={max}
        required
        autoComplete="bday"
        disabled={disabled}
        aria-invalid={!!error}
        className="min-w-[10.5rem]"
      />
    </LiveFormField>
  );
}

export function LiveEmptyRoster() {
  return (
    <div className="border-border rounded-brand-lg border border-dashed bg-background-muted/20 px-4 py-8 text-center">
      <p className="text-foreground-muted text-sm">Sin jugadores en el plantel de temporada.</p>
      <p className="text-foreground-subtle mt-1 text-xs">
        Usa alta al momento o registra jugadores en Equipos.
      </p>
    </div>
  );
}
