"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardArenaLayout } from "@/components/dashboard/DashboardArenaLayout";
import type {
  DashboardMyLeaguesState,
  MyLeaguesApiItem,
  MyLeaguesPlayerRow,
  MyLeaguesRefereeRow,
  MyLeaguesTeamRow,
  MyLeaguesVenueRow,
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
  venues?: MyLeaguesVenueRow[];
  referees?: MyLeaguesRefereeRow[];
  playersNextCursor?: string | null;
};

export default function DashboardPage() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [myLeagues, setMyLeagues] = useState<DashboardMyLeaguesState>({
    status: "loading",
  });
  const [playersLoadingMore, setPlayersLoadingMore] = useState(false);
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
          venues: data.venues ?? [],
          referees: data.referees ?? [],
          playersNextCursor: data.playersNextCursor ?? null,
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

  async function handleLoadMorePlayers(): Promise<{
    ok: boolean;
    playerCount: number;
    hasMore: boolean;
  } | null> {
    if (myLeagues.status !== "ready" || playersLoadingMore) return null;
    const cursor = myLeagues.playersNextCursor;
    if (!cursor) return null;
    setPlayersLoadingMore(true);
    try {
      const res = await fetch(
        `/api/leagues/my/players?cursor=${encodeURIComponent(cursor)}`,
        { method: "GET" },
      );
      if (res.status === 401) {
        router.replace("/");
        return null;
      }
      if (!res.ok) return { ok: false, playerCount: myLeagues.players.length, hasMore: true };
      const body = (await res.json()) as {
        players?: MyLeaguesPlayerRow[];
        nextCursor?: string | null;
      };
      const chunk = body.players ?? [];
      const nextCursor = body.nextCursor ?? null;

      let playerCount = myLeagues.players.length;
      let hasMore = nextCursor != null;

      setMyLeagues((prev) => {
        if (prev.status !== "ready") return prev;
        const seen = new Set(prev.players.map((p) => p.id));
        const merged = chunk.filter((p) => !seen.has(p.id));
        playerCount = prev.players.length + merged.length;
        hasMore = nextCursor != null;
        return {
          ...prev,
          players: [...prev.players, ...merged],
          playersNextCursor: nextCursor,
        };
      });

      return { ok: true, playerCount, hasMore };
    } finally {
      setPlayersLoadingMore(false);
    }
  }

  return (
    <DashboardArenaLayout
      avatarUrl={photo}
      avatarInitial={initial}
      onSignOut={() => void handleSignOut()}
      signingOut={signingOut}
      authConfigured={configured}
      myLeagues={myLeagues}
      railRefreshKey={refetchKey}
      onLeagueCreated={() => setRefetchKey((k) => k + 1)}
      onLoadMorePlayers={handleLoadMorePlayers}
      playersLoadingMore={playersLoadingMore}
    />
  );
}
