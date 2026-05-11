"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/components/providers/AuthProvider";

export function LoginLanding() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
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
    <div className="bg-background text-foreground relative flex min-h-dvh flex-col overflow-hidden">
      <div
        className="login-blobs pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div className="absolute -top-36 left-[15%] size-[min(100vw,420px)] rounded-full bg-brand-blue blur-[118px]" />
        <div className="absolute top-[28%] -right-28 size-[min(90vw,380px)] rounded-full bg-brand-purple blur-[108px]" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-1 flex-col items-center justify-center px-5 py-14 sm:px-8">
        <section className="flex w-full max-w-lg flex-col items-center justify-center">
          <div className="flex w-full max-w-sm flex-col items-center gap-5">
            <div className="flex w-full flex-col items-center gap-1.5">
              <Image
                src="/images/tornea_banner_transparent.png"
                alt="Tornea — organiza torneos y ligas deportivas"
                width={640}
                height={246}
                priority
                sizes="(max-width: 1024px) 85vw, 320px"
                className="drop-shadow-[0_14px_42px_rgba(37,99,255,0.28)] h-auto w-full max-w-[min(100%,300px)] sm:max-w-[340px]"
              />
              <div className="text-center">
                <p className="text-foreground-muted max-w-[26rem] text-sm leading-relaxed">
                  Una plataforma moderna para comunidades competitivas:
                  brackets, temporadas, equipos y aficionados en un mismo
                  ecosistema.
                </p>
              </div>
            </div>

            <GoogleSignInButton />

            {!configured && process.env.NODE_ENV === "development" ? (
              <p className="text-foreground-muted max-w-xs text-center text-[0.6875rem] leading-relaxed opacity-90">
                Activa Firebase: copia las claves de tu app web desde la
                consola de Firebase en{" "}
                <code className="text-foreground rounded-brand-sm bg-surface-code px-1 py-0.5 font-mono text-[0.625rem]">
                  .env.development.local
                </code>
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
