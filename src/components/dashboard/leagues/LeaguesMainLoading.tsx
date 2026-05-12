"use client";

type LeaguesMainLoadingProps = { message?: string };

export function LeaguesMainLoading({ message = "Cargando tus ligas…" }: LeaguesMainLoadingProps) {
  return (
    <div className="flex min-h-[min(50dvh,24rem)] flex-col items-center justify-center gap-4 px-4 py-16">
      <div
        className="border-brand-teal size-11 animate-spin rounded-full border-2 border-t-transparent"
        aria-hidden
      />
      <p className="text-foreground-muted text-sm">{message}</p>
    </div>
  );
}
