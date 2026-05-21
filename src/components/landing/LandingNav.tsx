"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { useGoogleSignIn } from "@/components/auth/use-google-sign-in";
import { TorneaLogo } from "@/components/brand/TorneaLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Funciones" },
  { href: "#jornada", label: "Jornada" },
  { href: "#como-funciona", label: "Cómo funciona" },
] as const;

function NavLink({
  href,
  label,
  onNavigate,
  className,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className={cn("landing-nav-link text-foreground-muted hover:text-foreground", className)}
    >
      <a href={href} onClick={onNavigate}>
        {label}
      </a>
    </Button>
  );
}

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signIn, pending, error } = useGoogleSignIn();

  return (
    <header className="landing-nav fixed inset-x-0 top-0 z-50 border-b border-border/50 backdrop-blur-xl">
      <div className="px-4 sm:px-6">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4">
          <Link
            href="/"
            className="shrink-0 rounded-brand-sm transition-opacity duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            aria-label="Tornea — inicio"
          >
            <TorneaLogo variant="nav" priority />
          </Link>

          <nav
            className="hidden items-center gap-0.5 md:flex"
            aria-label="Secciones de la página"
          >
            {NAV_LINKS.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-expanded={mobileOpen}
              aria-controls="landing-mobile-nav"
              onClick={() => setMobileOpen((open) => !open)}
            >
              <span className="sr-only">{mobileOpen ? "Cerrar menú" : "Abrir menú"}</span>
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>

            <Button
              type="button"
              variant="energy"
              size="sm"
              disabled={pending}
              onClick={() => void signIn()}
            >
              {pending ? "Conectando…" : "Entrar"}
            </Button>
          </div>
        </div>
        {error ? (
          <p
            className="text-destructive mx-auto max-w-6xl pt-1 text-center text-xs sm:text-right"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div
        id="landing-mobile-nav"
        className={cn(
          "border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden",
          mobileOpen ? "block" : "hidden",
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6" aria-label="Secciones de la página">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              className="w-full justify-start"
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
      </div>
    </header>
  );
}
