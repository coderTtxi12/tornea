"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

export type DashboardRightSlideoverSize = "sm" | "md" | "lg" | "xl" | "2xl";

type DashboardRightSlideoverProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  /** Ancho máximo del panel. Por defecto `lg` (~32rem). */
  size?: DashboardRightSlideoverSize;
  /**
   * Si es true, no se cierra por clic fuera, ✕ ni Escape (p. ej. guardando en curso).
   */
  preventClose?: boolean;
};

const SIZE_CLASS: Record<DashboardRightSlideoverSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-5xl",
};

/**
 * Panel lateral derecho reutilizable (overlay + hoja). Cierra con Escape o clic fuera.
 * Soporta varios anchos vía `size`.
 */
export function DashboardRightSlideover({
  open,
  title,
  description,
  onClose,
  children,
  size = "lg",
  preventClose = false,
}: DashboardRightSlideoverProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !preventClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, preventClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-busy={preventClose}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 backdrop-blur-[1px] ${preventClose ? "cursor-wait" : ""}`}
        aria-label={preventClose ? "Guardando…" : "Cerrar panel"}
        onClick={() => {
          if (!preventClose) onClose();
        }}
      />
      <aside
        className={`border-border bg-background relative z-[1] flex h-full w-full ${SIZE_CLASS[size]} flex-col border-l shadow-2xl`}
      >
        <header className="border-border flex shrink-0 flex-col gap-1 border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            <button
              type="button"
              onClick={() => {
                if (!preventClose) onClose();
              }}
              disabled={preventClose}
              className="text-foreground-muted hover:text-foreground rounded-full p-1.5 text-sm font-medium disabled:pointer-events-none disabled:opacity-40"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          {description ? (
            <p className="text-foreground-muted text-sm leading-relaxed">{description}</p>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}
