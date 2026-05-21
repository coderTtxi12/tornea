"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function LandingStickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`landing-sticky-cta fixed inset-x-0 bottom-0 z-40 border-t border-border/60 px-4 py-3 backdrop-blur-xl sm:hidden ${visible ? "landing-sticky-cta--visible" : ""}`}
      role="region"
      aria-label="Acceso rápido"
    >
      <Button variant="gradient" size="lg" className="mx-auto w-full max-w-md" asChild>
        <a href="#entrar">Entrar con Google</a>
      </Button>
    </div>
  );
}
