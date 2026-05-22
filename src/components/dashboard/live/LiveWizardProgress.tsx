"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { LIVE_WIZARD_STEPS, type LiveWizardStep } from "./live-wizard-config";

export function LiveWizardProgress({
  currentStep,
  onGoToStep,
}: {
  currentStep: LiveWizardStep;
  onGoToStep?: (step: LiveWizardStep) => void;
}) {
  const meta = LIVE_WIZARD_STEPS[currentStep - 1];

  return (
    <div className="space-y-4">
      <ol className="flex items-start gap-0" aria-label="Progreso del acta">
        {LIVE_WIZARD_STEPS.map((item, index) => {
          const stepNum = item.step;
          const done = stepNum < currentStep;
          const active = stepNum === currentStep;
          const last = index === LIVE_WIZARD_STEPS.length - 1;
          const canClick = onGoToStep && stepNum === 1 && currentStep > 1;

          return (
            <li key={stepNum} className="flex min-w-0 flex-1 items-start">
              <button
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onGoToStep?.(1)}
                className={cn(
                  "flex w-full flex-col items-center gap-1.5 text-center transition-colors duration-200",
                  canClick ? "cursor-pointer hover:opacity-90" : "cursor-default",
                  !canClick && "pointer-events-none",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-200",
                    done && "bg-brand-teal text-brand-navy",
                    active && "bg-brand-lime text-brand-navy ring-4 ring-brand-lime/25",
                    !done && !active && "border-border bg-background-muted text-foreground-muted border",
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : stepNum}
                </span>
                <span
                  className={cn(
                    "hidden text-[10px] font-bold uppercase tracking-wide sm:block",
                    active && "text-brand-lime",
                    done && "text-brand-teal",
                    !done && !active && "text-foreground-muted",
                  )}
                >
                  {item.step === 1
                    ? "Partido"
                    : item.step === 2
                      ? "Datos"
                      : item.step === 3
                        ? "Plantilla"
                        : "En vivo"}
                </span>
              </button>
              {!last ? (
                <div
                  className={cn(
                    "mx-1 mt-4 h-0.5 min-w-[0.5rem] flex-1 rounded-full transition-colors duration-200",
                    stepNum < currentStep ? "bg-brand-teal/60" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="border-border rounded-brand-lg border bg-background px-4 py-3 sm:px-5">
        <p className="text-brand-teal text-[10px] font-bold uppercase tracking-wider">
          Paso {currentStep} de {LIVE_WIZARD_STEPS.length}
        </p>
        <h2 className="mt-0.5 text-base font-semibold tracking-tight sm:text-lg">{meta.title}</h2>
        <p className="text-foreground-muted mt-1 text-sm leading-relaxed">{meta.description}</p>
      </div>
    </div>
  );
}
