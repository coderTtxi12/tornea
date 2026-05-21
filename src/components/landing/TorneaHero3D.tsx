"use client";

/**
 * Hero visual — CSS-only animation.
 * This used to mount a WebGL/R3F scene and hide this CSS version after the
 * canvas was ready. The CSS scene is now the default hero animation.
 */

import type { CSSProperties } from "react";

const BRAND = {
  lime: "#7dff6a",
  teal: "#00d4c8",
  blue: "#2563ff",
  purple: "#8b5cf6",
  navy: "#020818",
} as const;

const PLAYERS = [
  { x: -1.9, z: -0.85, color: BRAND.lime },
  { x: -0.95, z: 0.58, color: BRAND.teal },
  { x: 0.15, z: -0.15, color: BRAND.blue },
  { x: 1.05, z: -0.7, color: BRAND.purple },
  { x: 1.75, z: 0.72, color: BRAND.lime },
] as const;

function CssFallback() {
  return (
    <div className="landing-css-3d-scene" aria-hidden>
      <div className="landing-css-pitch">
        <span className="landing-css-midline" />
        <span className="landing-css-circle" />
        <span className="landing-css-goal landing-css-goal-left" />
        <span className="landing-css-goal landing-css-goal-right" />
        {PLAYERS.map((player, index) => (
          <span
            key={`${player.x}-${player.z}`}
            className="landing-css-player"
            style={{
              "--player-x": `${50 + player.x * 14}%`,
              "--player-y": `${50 + player.z * 22}%`,
              "--player-color": player.color,
              "--player-delay": `${index * 0.18}s`,
            } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

export function TorneaHero3D({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <CssFallback />
    </div>
  );
}
