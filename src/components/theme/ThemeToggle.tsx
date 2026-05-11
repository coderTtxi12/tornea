"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const label =
    theme === "dark"
      ? "Cambiar a tema claro"
      : "Cambiar a tema oscuro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="border-border bg-surface-card text-foreground hover:bg-surface-code fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-20 flex size-10 items-center justify-center rounded-full border shadow-[var(--card-shadow)] transition active:scale-[0.97] sm:size-11"
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? (
        <SunIcon className="size-5 shrink-0 text-brand-lime" />
      ) : (
        <MoonIcon className="size-5 shrink-0 text-brand-navy" />
      )}
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
