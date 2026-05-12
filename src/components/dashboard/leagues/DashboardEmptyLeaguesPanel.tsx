"use client";

import { useState } from "react";

import { floatCard } from "../views/dashboard-view-primitives";
import { NewLeagueForm } from "./NewLeagueForm";

export function DashboardEmptyLeaguesPanel() {
  const [step, setStep] = useState<"hero" | "form">("hero");

  if (step === "form") {
    return (
      <div className="flex flex-col items-stretch px-1 py-6 sm:px-2 lg:py-8">
        <div className={`${floatCard} mx-auto w-full max-w-2xl p-6 sm:p-8`}>
          <NewLeagueForm onCancel={() => setStep("hero")} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[min(70dvh,36rem)] flex-col items-center justify-center px-4 py-12">
      <div className={`${floatCard} max-w-md px-8 py-10 text-center`}>
        <div className="text-5xl" aria-hidden>
          ⚽
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">
          Aún no tenés ligas en Tornea
        </h1>
        <p className="text-foreground-muted mt-2 text-sm leading-relaxed">
          Creá tu primera organización para armar temporadas, fixture y tablas. Los datos del
          formulario son solo de prueba hasta que actives el guardado en base de datos.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => setStep("form")}
            className="rounded-full bg-brand-blue px-6 py-3 text-sm font-bold text-white"
          >
            Agregar nueva liga
          </button>
          <button
            type="button"
            onClick={() => setStep("form")}
            className="border-border text-foreground-muted hover:text-foreground rounded-full border px-6 py-3 text-sm font-semibold"
          >
            Comenzar
          </button>
        </div>
      </div>
    </div>
  );
}
