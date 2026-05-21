"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  LayoutList,
  MapPinned,
  Radio,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { LandingBentoCard } from "./LandingBentoCard";
import { LandingStickyCta } from "./LandingStickyCta";
import { useLandingInView } from "./hooks/use-landing-in-view";
import {
  LANDING_FEATURES,
  LANDING_PANEL_AREAS,
  LANDING_SLOGAN,
  LANDING_SPORTS,
  LANDING_STATS,
  LANDING_STEPS,
  MATCHDAY_EVENTS,
  TABLE_PREVIEW,
} from "./landing-data";

const TorneaHero3D = dynamic(
  () => import("./TorneaHero3D").then((m) => m.TorneaHero3D),
  {
    ssr: false,
    loading: () => (
      <div className="landing-hero-3d-fallback flex h-full min-h-[280px] w-full items-center justify-center rounded-brand-xl border border-border/60 bg-gradient-to-br from-brand-blue/10 via-transparent to-brand-purple/10">
        <div className="size-16 animate-pulse rounded-full bg-gradient-hero opacity-40" />
      </div>
    ),
  },
);

const FEATURE_ICONS = {
  leagues: Trophy,
  fixture: CalendarDays,
  live: Radio,
  rosters: UsersRound,
  venues: MapPinned,
  standings: LayoutList,
  stats: BarChart3,
} as const;

function subscribeToReducedMotion(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
}

function TorneaLogo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <span
        className="relative flex size-9 shrink-0 items-center justify-center rounded-brand-md bg-gradient-energy font-bold text-brand-navy shadow-[0_0_24px_rgba(125,255,106,0.35)] transition-transform duration-300 hover:scale-105"
        aria-hidden
      >
        T
      </span>
      <span className="text-lg font-bold tracking-tight">
        Tor<span className="bg-gradient-energy bg-clip-text text-transparent">nea</span>
      </span>
    </div>
  );
}

function LandingNav() {
  return (
    <header className="landing-nav fixed inset-x-0 top-0 z-50 border-b border-border/50 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="cursor-pointer transition-opacity hover:opacity-90">
          <TorneaLogo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <a href="#features">Funciones</a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href="#jornada">Jornada</a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href="#como-funciona">Cómo funciona</a>
          </Button>
        </nav>
        <Button variant="gradient" size="sm" asChild>
          <a href="#entrar">Entrar</a>
        </Button>
      </div>
    </header>
  );
}

function SportsMarquee() {
  const groups = [LANDING_SPORTS, LANDING_SPORTS];

  return (
    <div className="landing-marquee overflow-hidden border-y border-border/40 bg-background-muted/40 py-3">
      <div className="landing-marquee-track flex w-max text-sm font-semibold tracking-wide text-foreground-muted uppercase">
        {groups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            aria-hidden={groupIndex > 0}
            className="flex min-w-screen shrink-0 items-center justify-around gap-8 px-4"
          >
            {group.map((sport) => (
              <span
                key={`${groupIndex}-${sport}`}
                className="shrink-0 transition-colors hover:text-brand-lime"
              >
                {sport}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BentoGrid({ reduceMotion }: { reduceMotion: boolean }) {
  const { ref, className: inViewClass } = useLandingInView<HTMLDivElement>(0.06);

  return (
    <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div
          ref={ref}
          className={`landing-scroll-reveal mb-10 max-w-2xl lg:mb-12 ${inViewClass}`}
        >
          <Badge variant="energy" className="mb-2 tracking-[0.15em] uppercase">
            Plataforma para fútbol
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Todo lo que tu liga necesita antes, durante y después del partido
          </h2>
          <p className="text-foreground-muted mt-3 text-base leading-relaxed">
            Las mismas áreas que verás en el panel — ligas, fixture, en vivo, equipos,
            plantillas, sedes, tabla y estadísticas — más disciplina y actas cuando la
            operación lo exige.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {LANDING_FEATURES.map((f, index) => {
            const Icon = FEATURE_ICONS[f.id as keyof typeof FEATURE_ICONS];
            return (
              <LandingBentoCard
                key={f.id}
                navLabel={f.navLabel}
                title={f.title}
                description={f.description}
                accent={f.accent}
                delayIndex={index}
                reduceMotion={reduceMotion}
                className={"gridClass" in f ? f.gridClass : undefined}
                icon={<Icon className="size-5" aria-hidden />}
              />
            );
          })}
        </div>

        <p className="text-foreground-muted mt-8 text-center text-xs sm:text-sm">
          También en el panel
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {LANDING_PANEL_AREAS.map((area) => (
            <Badge key={area} variant="outline" className="px-2.5 py-0.5 font-mono text-[0.625rem]">
              {area}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroSection({
  reduceMotion,
  configured,
}: {
  reduceMotion: boolean;
  configured: boolean;
}) {
  const { ref, className: inViewClass } = useLandingInView<HTMLElement>(0.05);

  return (
    <section
      ref={ref}
      className={`landing-scroll-reveal relative px-4 pt-24 pb-6 sm:px-6 sm:pt-28 sm:pb-8 ${inViewClass}`}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="relative z-10 flex flex-col gap-5">
          <Badge variant="outline" className="w-fit px-3 py-1">
            <span className="size-1.5 rounded-full bg-brand-lime landing-pulse-dot" />
            Software para ligas de fútbol
          </Badge>
          <h1 className="text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl lg:text-[3.25rem]">
            <span className="block">Tu liga juega mejor</span>
            <span className="mt-1 block bg-gradient-energy bg-clip-text text-transparent">
              cuando la operación está ordenada.
            </span>
          </h1>
          <p className="text-foreground-muted max-w-lg text-base leading-relaxed sm:text-lg">
            Crea torneos, arma jornadas, registra planteles y publica resultados desde
            un ecosistema moderno para organizadores de fútbol competitivo.
          </p>
          {!configured && process.env.NODE_ENV === "development" ? (
            <p className="text-foreground-muted max-w-md text-[0.6875rem] leading-relaxed opacity-90">
              Desarrollo: configura{" "}
              <code className="rounded-brand-sm bg-surface-code px-1 font-mono text-[0.625rem]">
                NEXT_PUBLIC_SUPABASE_*
              </code>{" "}
              en{" "}
              <code className="rounded-brand-sm bg-surface-code px-1 font-mono text-[0.625rem]">
                .env.local
              </code>
            </p>
          ) : null}
        </div>

        <div className="relative z-10 min-h-[240px] sm:min-h-[280px] lg:min-h-[340px]">
          <div className="landing-hero-frame relative h-[min(64vw,340px)] w-full overflow-hidden sm:h-[min(58vw,360px)] lg:h-[340px] lg:min-h-0">
            {reduceMotion ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
                <div className="landing-static-orb size-32 rounded-full bg-gradient-hero opacity-80" />
                <p className="text-foreground-muted text-center text-sm">
                  Vista estática (movimiento reducido activado)
                </p>
              </div>
            ) : (
              <TorneaHero3D className="absolute inset-0 h-full w-full" />
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
          </div>
        </div>
      </div>

      <div
        id="entrar"
        className="landing-hero-cta relative z-10 mx-auto mt-8 max-w-6xl sm:mt-10"
      >
        <GoogleSignInButton align="start" />
      </div>
    </section>
  );
}

export function TorneaLanding() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!loading && user) {
      let cancelled = false;
      void (async () => {
        try {
          const r = await fetch("/api/auth/dashboard-access");
          if (cancelled) return;
          if (r.status === 401) {
            router.replace("/");
            return;
          }
          const data = (await r.json()) as { allowed?: boolean };
          router.replace(data.allowed ? "/dashboard" : "/solicitar-acceso");
        } catch {
          if (!cancelled) router.replace("/");
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center">
        <div
          className="border-brand-teal size-11 animate-spin rounded-full border-2 border-t-transparent"
          aria-label="Cargando"
          role="status"
        />
      </div>
    );
  }

  if (user) {
    return (
      <div className="bg-background min-h-dvh" aria-hidden>
        <span className="sr-only">Redirigiendo…</span>
      </div>
    );
  }

  return (
    <div className="landing-page bg-background text-foreground relative min-h-dvh overflow-x-hidden pb-20 sm:pb-0">
      <div className="landing-aurora pointer-events-none fixed inset-0" aria-hidden />
      <div className="landing-grid-overlay pointer-events-none fixed inset-0 opacity-[0.04]" aria-hidden />
      <LandingNav />
      <LandingStickyCta />

      <main>
        <HeroSection reduceMotion={reduceMotion} configured={configured} />
        <SportsMarquee />
        <BentoGrid reduceMotion={reduceMotion} />
        <MatchdaySection />
        <StatsSection />
        <HowItWorksSection />
        <FinalCtaSection />
      </main>

      <footer className="px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        <Separator className="mb-8" />
        <TorneaLogo className="justify-center" />
        <p className="mt-3">{LANDING_SLOGAN}</p>
        <p className="mt-1 opacity-70">© {new Date().getFullYear()} Tornea</p>
      </footer>
    </div>
  );
}

function MatchdaySection() {
  const { ref, className: inViewClass } = useLandingInView<HTMLDivElement>(0.08);

  return (
    <section id="jornada" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div
        ref={ref}
        className={`landing-scroll-reveal mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] ${inViewClass}`}
      >
        <div>
          <Badge variant="outline" className="mb-3">
            <ShieldCheck className="size-3.5" />
            Centro de jornada
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            La cancha, la tabla y el marcador hablan el mismo idioma
          </h2>
          <p className="text-foreground-muted mt-4 max-w-xl text-base leading-relaxed">
            Consulta lo que pasa en cada partido sin perseguir mensajes sueltos: partidos
            programados, incidencias, goles y resultados, todo conectado.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {["Calendario", "Árbitros", "Goles", "Tabla"].map((item) => (
              <Badge key={item} variant="muted" className="px-3 py-1">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        <Card className="landing-matchday-panel relative overflow-hidden border-brand-teal/20 bg-card/70 p-0 shadow-none backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(125,255,106,0.18),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(37,99,255,0.2),transparent_34%)]" />
          <div className="relative grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_0.75fr]">
            <div className="landing-pitch-card rounded-brand-lg border border-brand-lime/20 p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-brand-lime uppercase">
                    Jornada 12
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">Deportivo Norte vs Atlético Sur</h3>
                </div>
                <Badge variant="energy">En vivo</Badge>
              </div>
              <div className="landing-mini-pitch relative min-h-[260px] overflow-hidden rounded-brand-md border border-white/15">
                <div className="absolute inset-4 rounded-[1rem] border border-white/30" />
                <div className="absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
                <div className="absolute top-1/2 left-1/2 h-full w-px -translate-y-1/2 bg-white/25" />
                {[
                  ["18%", "25%"],
                  ["28%", "62%"],
                  ["48%", "45%"],
                  ["69%", "28%"],
                  ["78%", "68%"],
                ].map(([left, top], index) => (
                  <span
                    key={`${left}-${top}`}
                    className="landing-player-dot absolute size-3 rounded-full bg-brand-lime shadow-[0_0_18px_rgba(125,255,106,0.65)]"
                    style={{ left, top, animationDelay: `${index * 0.16}s` }}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="border-border/70 bg-background/50 p-4 shadow-none">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Incidencias</p>
                  <Radio className="size-4 text-brand-teal" />
                </div>
                <div className="mt-4 space-y-3">
                  {MATCHDAY_EVENTS.map((event) => (
                    <div
                      key={`${event.minute}-${event.event}`}
                      className="rounded-brand-md border border-border/60 bg-background-muted/30 p-3 transition-colors duration-200 hover:border-brand-teal/40"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-mono text-brand-lime">{event.minute}</span>
                        <span className="font-semibold">{event.score}</span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">{event.event}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-border/70 bg-background/50 p-4 shadow-none">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Tabla rápida</p>
                  <Trophy className="size-4 text-brand-lime" />
                </div>
                <div className="mt-4 space-y-2">
                  {TABLE_PREVIEW.map((row) => (
                    <div
                      key={row.club}
                      className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2 text-sm"
                    >
                      <span className="text-muted-foreground font-mono">{row.pos}</span>
                      <span className="truncate">{row.club}</span>
                      <span className="text-right font-semibold text-brand-teal">{row.pts}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function StatsSection() {
  const { ref, className: inViewClass } = useLandingInView<HTMLDivElement>(0.1);

  return (
    <section className="border-y border-border/40 bg-background-muted/30 px-4 py-14 sm:px-6">
      <div
        ref={ref}
        className={`landing-scroll-reveal mx-auto grid max-w-6xl gap-8 sm:grid-cols-3 ${inViewClass}`}
      >
        {LANDING_STATS.map((s) => (
          <Card
            key={s.label}
            className="landing-stat-card gap-2 border-transparent bg-transparent p-4 shadow-none text-center sm:text-left"
          >
            <CardTitle className="bg-gradient-energy bg-clip-text text-2xl text-transparent">
              {s.value}
            </CardTitle>
            <CardDescription>{s.label}</CardDescription>
          </Card>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const { ref, className: inViewClass } = useLandingInView<HTMLDivElement>(0.08);

  return (
    <section id="como-funciona" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div ref={ref} className={`landing-scroll-reveal mx-auto max-w-6xl ${inViewClass}`}>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Cómo funciona</h2>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {LANDING_STEPS.map((step) => (
            <li key={step.step}>
              <Card className="landing-step-card h-full gap-3 border-border/70 bg-card/50 p-0 shadow-none">
                <CardHeader className="px-6 pt-6 pb-6">
                  <Badge variant="outline" className="w-fit font-mono">
                    {step.step}
                  </Badge>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                  <CardDescription>{step.body}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  const { ref, className: inViewClass } = useLandingInView<HTMLDivElement>(0.12);

  return (
    <section className="landing-cta-band relative px-4 py-20 sm:px-6 sm:py-28">
      <div
        ref={ref}
        className={`landing-scroll-reveal relative z-10 mx-auto max-w-2xl text-center ${inViewClass}`}
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Empieza a ordenar tu liga hoy</h2>
        <p className="text-foreground-muted mx-auto mt-3 max-w-md text-base">
          Inicia sesión con Google y accede al panel. Si tu cuenta aún no tiene acceso, puedes
          solicitarlo en minutos.
        </p>
        <div className="mt-8 flex justify-center">
          <GoogleSignInButton />
        </div>
      </div>
    </section>
  );
}
