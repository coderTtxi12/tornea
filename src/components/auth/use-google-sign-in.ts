"use client";

import { useCallback, useState } from "react";

import { createClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/supabase/site-url";

export function useGoogleSignIn() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const signIn = useCallback(async () => {
    setError(null);

    if (!isSupabaseAuthConfigured()) {
      setError(
        "Faltan las variables NEXT_PUBLIC_SUPABASE_* en .env o .env.local.",
      );
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthCallbackUrl("/dashboard"),
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setPending(false);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo iniciar sesión con Google.",
      );
      setPending(false);
    }
  }, []);

  return { signIn, error, pending };
}
