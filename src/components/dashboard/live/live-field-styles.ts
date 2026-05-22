/**
 * Campos de formulario en Cancha · En vivo — mismo lenguaje que
 * `AccessRequestWizard` (solicitar-acceso): fondo sólido, borde suave, foco teal.
 * Controles altos y redondeo consistente para uso táctil en pantallas pequeñas.
 */

export const LIVE_FIELD_CLASS =
  "border-border bg-background text-foreground w-full min-w-0 rounded-brand-lg border px-4 py-3 text-base outline-none transition-colors duration-200 placeholder:text-foreground-subtle focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/30 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";

export const LIVE_SELECT_CLASS =
  "border-border bg-background text-foreground w-full min-w-0 cursor-pointer appearance-none rounded-brand-lg border py-3 pr-10 pl-4 text-base outline-none transition-colors duration-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/30 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";

export const LIVE_FIELD_DATE_CLASS = `${LIVE_FIELD_CLASS} [color-scheme:dark]`;

/** Paneles y cards en Cancha · En vivo — mismo fondo que los campos. */
export const LIVE_PANEL_CLASS =
  "bg-background border-border shadow-none";
