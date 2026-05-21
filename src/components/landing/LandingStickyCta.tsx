"use client";

import { useEffect, useState } from "react";

import { useGoogleSignIn } from "@/components/auth/use-google-sign-in";
import { Button } from "@/components/ui/button";

export function LandingStickyCta() {
  const [visible, setVisible] = useState(false);
  const { signIn, pending } = useGoogleSignIn();

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
      <Button
        type="button"
        variant="energy"
        size="lg"
        className="mx-auto w-full max-w-md"
        disabled={pending}
        onClick={() => void signIn()}
      >
        {pending ? "Conectando…" : "Entrar con Google"}
      </Button>
    </div>
  );
}
