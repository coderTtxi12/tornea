export type LiveWizardStep = 1 | 2 | 3 | 4;

export const LIVE_WIZARD_STEPS = [
  {
    step: 1 as const,
    title: "Elige el partido",
    description: "Selecciona el encuentro que vas a operar en cancha.",
  },
  {
    step: 2 as const,
    title: "Datos del partido",
    description: "Confirma jugadores en cancha y duración de los tiempos.",
  },
  {
    step: 3 as const,
    title: "Plantilla",
    description: "Marca titulares y suplentes; puedes dar de alta jugadores al momento.",
  },
  {
    step: 4 as const,
    title: "En vivo",
    description: "Reloj, incidencias y cierre del encuentro.",
  },
] as const;

export function operationsPhaseToWizardStep(
  phase: string,
): 2 | 3 | 4 {
  if (phase === "setup") return 2;
  if (phase === "lineups" || phase === "ready") return 3;
  return 4;
}

type LiveCourtFullscreenListener = () => void;

let liveCourtFullscreenOpen = false;
const liveCourtFullscreenListeners = new Set<LiveCourtFullscreenListener>();

export function getLiveCourtFullscreenOpen(): boolean {
  return liveCourtFullscreenOpen;
}

export function setLiveCourtFullscreenOpen(next: boolean): void {
  if (liveCourtFullscreenOpen === next) return;
  liveCourtFullscreenOpen = next;
  for (const listener of liveCourtFullscreenListeners) listener();
}

export function subscribeLiveCourtFullscreen(listener: LiveCourtFullscreenListener): () => void {
  liveCourtFullscreenListeners.add(listener);
  return () => {
    liveCourtFullscreenListeners.delete(listener);
  };
}
