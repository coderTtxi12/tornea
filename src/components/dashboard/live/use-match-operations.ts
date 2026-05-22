"use client";

import { useCallback, useEffect, useState } from "react";

import type { MatchOperationsBundle } from "./match-operations-types";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; bundle: MatchOperationsBundle };

export function useMatchOperations(leagueId: string | null, matchId: string | null) {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async (mode: "initial" | "silent" = "initial") => {
    if (!leagueId || !matchId) {
      setState({ status: "idle" });
      return;
    }
    if (mode === "silent") {
      setRefreshing(true);
    } else {
      setState((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
    }
    try {
      const res = await fetch(
        `/api/leagues/${leagueId}/matches/${matchId}/operations`,
        { method: "GET" },
      );
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        setState({
          status: "error",
          message: errBody.error ?? "No se pudo cargar el partido.",
        });
        return;
      }
      const bundle = (await res.json()) as MatchOperationsBundle;
      setState({ status: "ready", bundle });
    } catch {
      if (mode === "silent") {
        setState((prev) =>
          prev.status === "ready" ? prev : { status: "error", message: "Error de red." },
        );
      } else {
        setState({ status: "error", message: "Error de red." });
      }
    } finally {
      if (mode === "silent") setRefreshing(false);
    }
  }, [leagueId, matchId]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(id);
  }, [reload]);

  const post = useCallback(
    async (path: string, body?: unknown) => {
      if (!leagueId || !matchId) return { ok: false as const, error: "Sin partido" };
      const res = await fetch(
        `/api/leagues/${leagueId}/matches/${matchId}/operations/${path}`,
        {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        return { ok: false as const, error: data.error ?? "Error" };
      }
      await reload("silent");
      return { ok: true as const, data };
    },
    [leagueId, matchId, reload],
  );

  const put = useCallback(
    async (path: string, body: unknown) => {
      if (!leagueId || !matchId) return { ok: false as const, error: "Sin partido" };
      const res = await fetch(
        `/api/leagues/${leagueId}/matches/${matchId}/operations/${path}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        return { ok: false as const, error: data.error ?? "Error" };
      }
      await reload("silent");
      return { ok: true as const };
    },
    [leagueId, matchId, reload],
  );

  return { state, refreshing, reload, post, put };
}
