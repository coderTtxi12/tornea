"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type {
  DashboardMyLeaguesState,
  MyLeaguesApiItem,
  MyLeaguesPlayerRow,
  MyLeaguesRefereeRow,
  MyLeaguesTeamRow,
  MyLeaguesVenueRow,
} from "@/components/dashboard/leagues/my-leagues-state";

type MyLeaguesApiJson = {
  leagues: MyLeaguesApiItem[];
  teams?: MyLeaguesTeamRow[];
  players?: MyLeaguesPlayerRow[];
  venues?: MyLeaguesVenueRow[];
  referees?: MyLeaguesRefereeRow[];
  playersNextCursor?: string | null;
  teamsNextCursor?: string | null;
};

export function useMyLeagues(userId: string | undefined) {
  const router = useRouter();
  const [myLeagues, setMyLeagues] = useState<DashboardMyLeaguesState>({
    status: "loading",
  });
  const [playersLoadingMore, setPlayersLoadingMore] = useState(false);
  const [teamsLoadingMore, setTeamsLoadingMore] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => setRefetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setMyLeagues({ status: "loading" });
    });

    void (async () => {
      try {
        const res = await fetch("/api/leagues/my", { method: "GET" });
        if (cancelled) return;

        if (res.status === 401) {
          router.replace("/");
          return;
        }

        if (!res.ok) {
          setMyLeagues({
            status: "error",
            message: "No pudimos cargar tus ligas. Reintentá en un momento.",
            onRetry: refetch,
          });
          return;
        }

        const data = (await res.json()) as MyLeaguesApiJson;
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
            onRetry: refetch,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, refetchKey, router, refetch]);

  const handleLoadMoreTeams = useCallback(async (): Promise<{
    ok: boolean;
    teamCount: number;
    hasMore: boolean;
  } | null> => {
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
      if (!res.ok) {
        return { ok: false, teamCount: myLeagues.teams.length, hasMore: true };
      }
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
  }, [myLeagues, router, teamsLoadingMore]);

  const handleLoadMorePlayers = useCallback(async (): Promise<{
    ok: boolean;
    playerCount: number;
    hasMore: boolean;
  } | null> => {
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
      if (!res.ok) {
        return { ok: false, playerCount: myLeagues.players.length, hasMore: true };
      }
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
  }, [myLeagues, router, playersLoadingMore]);

  return {
    myLeagues,
    refetchKey,
    refetch,
    playersLoadingMore,
    teamsLoadingMore,
    handleLoadMoreTeams,
    handleLoadMorePlayers,
  };
}
