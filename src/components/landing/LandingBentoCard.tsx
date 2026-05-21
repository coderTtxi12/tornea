"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useLandingInView } from "./hooks/use-landing-in-view";

type LandingBentoCardProps = {
  navLabel: string;
  title: string;
  description: string;
  accent: string;
  delayIndex: number;
  icon: ReactNode;
  reduceMotion?: boolean;
  className?: string;
};

export function LandingBentoCard({
  navLabel,
  title,
  description,
  accent,
  delayIndex,
  icon,
  reduceMotion = false,
  className,
}: LandingBentoCardProps) {
  const { ref, className: inViewClass } = useLandingInView<HTMLDivElement>(0.08);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    e.currentTarget.style.setProperty("--tilt-x", `${(y * -6).toFixed(2)}deg`);
    e.currentTarget.style.setProperty("--tilt-y", `${(x * 6).toFixed(2)}deg`);
  }

  function handleLeave(e: React.MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.setProperty("--tilt-x", "0deg");
    e.currentTarget.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <Card
      ref={ref}
      className={cn(
        "landing-bento-card landing-scroll-reveal group relative flex min-h-[11.5rem] gap-0 overflow-hidden border-border/80 bg-card/60 p-0 backdrop-blur-sm sm:min-h-[12.5rem]",
        !reduceMotion && "landing-bento-tilt",
        className,
        inViewClass,
      )}
      style={{ transitionDelay: `${0.05 * delayIndex}s` }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          accent,
        )}
        aria-hidden
      />
      <CardHeader className="relative z-10 flex h-full flex-col px-5 pt-5 pb-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-brand-md border border-brand-teal/30 bg-brand-blue/10 text-brand-teal transition-colors duration-300 group-hover:border-brand-lime/50 group-hover:text-brand-lime">
            {icon}
          </span>
          <Badge variant="muted" className="shrink-0 font-mono text-[0.625rem] tracking-wide uppercase">
            {navLabel}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-snug transition-colors duration-300 group-hover:text-foreground">
          {title}
        </CardTitle>
        <CardDescription className="mt-auto pt-2 text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
