"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardArenaLayout } from "@/components/dashboard/DashboardArenaLayout";
import type {
  DashboardMyLeaguesState,
  MyLeaguesApiItem,
  MyLeaguesPlayerRow,
  MyLeaguesTeamRow,
} from "@/components/dashboard/leagues/my-leagues-state";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import {
  getAvatarUrl,
  getDisplayName,
} from "@/lib/supabase/user-display";

type LeaguesMyApiResponse = {
  leagues: MyLeaguesApiItem[];
  teams?: MyLeaguesTeamRow[];
  players?: MyLeaguesPlayerRow[];
};

export default function DashboardPage() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [myLeagues, setMyLeagues] = useState<DashboardMyLeaguesState>({
    status: "loading",
  });
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    setMyLeagues({ status: "loading" });

    const bump = () => setRefetchKey((k) => k + 1);

    void (async () => {
      try {
        const res = await fetch("/api/leagues/my", { method: "GET" });
        if (cancelled) return;

        if (res.status === 401) {
          router.replace("/");
          return;
        }

        if (!res.ok) {
          if (cancelled) return;
          setMyLeagues({
            status: "error",
            message: "No pudimos cargar tus ligas. Reintentá en un momento.",
            onRetry: bump,
          });
          return;
        }

        const data = (await res.json()) as LeaguesMyApiResponse;
        if (cancelled) return;
        setMyLeagues({
          status: "ready",
          items: data.leagues ?? [],
          teams: data.teams ?? [],
          players: data.players ?? [],
        });
      } catch {
        if (!cancelled) {
          setMyLeagues({
            status: "error",
            message: "Error de red al consultar tus ligas.",
            onRetry: bump,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, refetchKey, router]);

  async function handleSignOut() {
    if (!isSupabaseAuthConfigured()) return;
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/");
    } finally {
      setSigningOut(false);
    }
  }

  if (loading || !user) {
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

  const name = getDisplayName(user);
  const photo = getAvatarUrl(user);
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <DashboardArenaLayout
      avatarUrl={photo}
      avatarInitial={initial}
      onSignOut={() => void handleSignOut()}
      signingOut={signingOut}
      authConfigured={configured}
      myLeagues={myLeagues}
      onLeagueCreated={() => setRefetchKey((k) => k + 1)}
    />
  );
}
