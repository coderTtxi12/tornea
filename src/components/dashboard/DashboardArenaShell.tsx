"use client";

import { usePathname, useRouter } from "next/navigation";
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
import { dashboardNavKeyFromPathname } from "@/components/dashboard/nav/dashboard-routes";
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
  teamsNextCursor?: string | null;
};

/** Client shell: auth, myLeagues fetch, layout. Mount once in `(arena)/layout`. */
export default function DashboardArenaShell() {
  const pathname = usePathname();
  const nav = dashboardNavKeyFromPathname(pathname) ?? "home";
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [myLeagues, setMyLeagues] = useState<DashboardMyLeaguesState>({
    status: "loading",
  });
  const [playersLoadingMore, setPlayersLoadingMore] = useState(false);
  const [teamsLoadingMore, setTeamsLoadingMore] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (dashboardNavKeyFromPathname(pathname) === null) {
      router.replace("/dashboard");
    }
  }, [pathname, router]);

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
          teamsNextCursor: data.teamsNextCursor ?? null,
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

  async function handleLoadMoreTeams(): Promise<{
    ok: boolean;
    teamCount: number;
    hasMore: boolean;
  } | null> {
    if (myLeagues.status !== "ready" || teamsLoadingMore) return null;
    const cursor = myLeagues.teamsNextCursor;
    if (!cursor) return null;
    setTeamsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/leagues/my/teams?cursor=${encodeURIComponent(cursor)}`,
        { method: "GET" },
      );
      if (res.status === 401) {
        router.replace("/");
        return null;
      }
      if (!res.ok) return { ok: false, teamCount: myLeagues.teams.length, hasMore: true };
      const body = (await res.json()) as {
        teams?: MyLeaguesTeamRow[];
        nextCursor?: string | null;
      };
      const chunk = body.teams ?? [];
      const nextCursor = body.nextCursor ?? null;

      let teamCount = myLeagues.teams.length;
      let hasMore = nextCursor != null;

      setMyLeagues((prev) => {
        if (prev.status !== "ready") return prev;
        const seen = new Set(prev.teams.map((t) => t.id));
        const merged = chunk.filter((t) => !seen.has(t.id));
        teamCount = prev.teams.length + merged.length;
        hasMore = nextCursor != null;
        return {
          ...prev,
          teams: [...prev.teams, ...merged],
          teamsNextCursor: nextCursor,
        };
      });

      return { ok: true, teamCount, hasMore };
    } finally {
      setTeamsLoadingMore(false);
    }
  }

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
      nav={nav}
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
      onLoadMoreTeams={handleLoadMoreTeams}
      teamsLoadingMore={teamsLoadingMore}
    />
  );
}
