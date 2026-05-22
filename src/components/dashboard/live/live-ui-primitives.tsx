"use client";

import { useMemo, type ReactNode } from "react";
import { Check, MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  BIRTH_DATE_MIN_ISO,
  birthDateMaxIso,
} from "@/logic/players/birth-date-validation";

import { LiveFormField } from "./live-form-field";
import { formatMatchSchedule } from "./live-match-format";
import { floatCard } from "../views/dashboard-view-primitives";

export const liveInputClass =
  "mt-1.5 w-full rounded-brand-md border border-border bg-background-muted/60 px-3 py-2.5 text-sm text-foreground transition-colors duration-200 placeholder:text-foreground-subtle focus:border-brand-teal/50 focus:outline-none focus:ring-2 focus:ring-brand-teal/25";

export const liveSelectClass =
  "cursor-pointer rounded-brand-md border border-border bg-background-muted/60 px-3 py-2.5 text-sm text-foreground transition-colors duration-200 focus:border-brand-teal/50 focus:outline-none focus:ring-2 focus:ring-brand-teal/25";

export function LivePanelShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${floatCard} overflow-hidden ${className}`}>{children}</div>
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
    <div className="border-border flex flex-wrap items-start justify-between gap-3 border-b bg-background-muted/30 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon ? (
            <span className="bg-brand-teal/15 text-brand-teal flex size-8 shrink-0 items-center justify-center rounded-brand-md">
              {icon}
            </span>
          ) : null}
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        </div>
        {description ? (
          <p className="text-foreground-muted mt-1 max-w-xl text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function LiveSectionBody({ children }: { children: ReactNode }) {
  return <div className="p-5 sm:p-6">{children}</div>;
}

const STEPS = [
  { key: "setup", label: "Datos" },
  { key: "lineups", label: "Plantilla" },
  { key: "live", label: "En vivo" },
] as const;

export function LivePhaseStepper({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="border-border border-t bg-surface-card/50 px-4 py-4 sm:px-6">
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
    <div className={`${floatCard} overflow-hidden`}>
      <div className="bg-gradient-night relative px-5 py-6 sm:px-8 sm:py-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, var(--tornea-teal) 22%, transparent), transparent)",
          }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge}
            {clockLabel ? (
              <span className="text-foreground-muted rounded-full border border-border bg-surface-card/80 px-3 py-1 text-xs font-medium tabular-nums">
                {clockLabel}
              </span>
            ) : null}
          </div>
          {categoryName || scheduleLabel ? (
            <div className="min-w-0 text-right text-xs leading-relaxed">
              {categoryName ? (
                <p className="text-brand-teal font-semibold">{categoryName}</p>
              ) : null}
              {scheduleLabel ? (
                <p className="text-foreground-muted tabular-nums">{scheduleLabel}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="relative mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold leading-tight sm:text-xl">{homeName}</p>
            <p className="text-brand-teal/90 mt-0.5 text-[11px] font-semibold uppercase tracking-wider">
              Local
            </p>
          </div>
          <div className="px-2">
            <p className="text-4xl font-black tabular-nums tracking-tight sm:text-5xl">
              <span className="text-brand-lime">{homeScore}</span>
              <span className="text-foreground-muted mx-2 font-semibold">–</span>
              <span className="text-brand-lime">{awayScore}</span>
            </p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold leading-tight sm:text-xl">{awayName}</p>
            <p className="text-brand-teal/90 mt-0.5 text-[11px] font-semibold uppercase tracking-wider">
              Visitante
            </p>
          </div>
        </div>
        {venueName ? (
          <p className="text-foreground-muted relative mt-4 flex items-center justify-center gap-1.5 text-xs">
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
      <Input
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
