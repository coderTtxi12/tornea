"use client";

type LeaguesMainErrorProps = {
  message: string;
  onRetry: () => void;
};

export function LeaguesMainError({ message, onRetry }: LeaguesMainErrorProps) {
  return (
    <div className="flex min-h-[min(50dvh,20rem)] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-foreground-muted max-w-sm text-sm leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-border bg-surface-code px-5 py-2 text-sm font-semibold"
      >
        Reintentar
      </button>
    </div>
  );
}
