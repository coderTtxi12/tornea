import type { ReactNode } from "react";

import { DASHBOARD_FLOAT_CARD } from "../dashboard-styles";

type MockActionProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

/**
 * Botón mock: no navega ni dispara lógica — solo UI.
 */
export function MockActionButton({
  children,
  variant = "secondary",
  className = "",
}: MockActionProps) {
  const base =
    "cursor-not-allowed rounded-full text-sm font-semibold opacity-90 transition-opacity disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-brand-blue px-5 py-2.5 text-white"
      : variant === "ghost"
        ? "border border-transparent px-4 py-2 text-foreground-muted underline-offset-4 hover:underline"
        : "border-border bg-background-muted/50 border px-4 py-2";
  return (
    <button type="button" disabled className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function DashboardViewHeader({
  title,
  hint,
  actions,
}: {
  title: string;
  hint?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {hint ? (
          <p className="text-foreground-muted mt-1 max-w-2xl text-sm leading-relaxed">{hint}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function MockBadge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "lime" | "blue" | "warn";
}) {
  const tones: Record<typeof tone, string> = {
    muted: "bg-surface-code text-foreground-muted border-border border",
    lime: "bg-brand-lime text-brand-navy",
    blue: "bg-brand-blue/20 text-brand-teal border border-brand-blue/30",
    warn: "bg-brand-purple/20 text-foreground border border-brand-purple/35",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${tones[tone]}`}>
      {children}
    </span>
  );
}

export { DASHBOARD_FLOAT_CARD };

/** Alias usado en vistas — mismo token. */
export const floatCard = DASHBOARD_FLOAT_CARD;
