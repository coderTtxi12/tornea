"use client";

import { floatCard } from "../views/dashboard-view-primitives";

export function DashboardEmptyLeaguesPanel({
  onOpenNewLeagueDrawer,
}: {
  onOpenNewLeagueDrawer: () => void;
}) {
  return (
    <div className="flex min-h-[min(70dvh,36rem)] flex-col items-center justify-center px-4 py-12">
      <div className={`${floatCard} max-w-md px-8 py-10 text-center`}>
        <div className="text-5xl" aria-hidden>
          ⚽
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">
          Aún no tienes ligas en Tornea
        </h1>
        <p className="text-foreground-muted mt-2 text-sm leading-relaxed">
          Crea tu primera organización para armar temporadas, fixture y tablas. El formulario se abre
          en un panel a la derecha.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onOpenNewLeagueDrawer}
            className="rounded-full bg-brand-blue px-6 py-3 text-sm font-bold text-white"
          >
            Agregar nueva liga
          </button>
          <button
            type="button"
            onClick={onOpenNewLeagueDrawer}
            className="border-border text-foreground-muted hover:text-foreground rounded-full border px-6 py-3 text-sm font-semibold"
          >
            Comenzar
          </button>
        </div>
      </div>
    </div>
  );
}
