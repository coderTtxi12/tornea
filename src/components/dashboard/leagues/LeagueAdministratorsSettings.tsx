"use client";

import { useCallback, useEffect, useState } from "react";

import { floatCard } from "../views/dashboard-view-primitives";

import type { MyLeaguesApiItem } from "./my-leagues-state";

type AdminRow = {
  userId: string;
  email: string;
  displayName: string | null;
  memberRole: "owner" | "admin";
  isSuperuser: boolean;
  createdAt: string;
};

type AdminsPayload = {
  superuserUserId: string;
  viewerIsSuperuser: boolean;
  admins: AdminRow[];
};

export function LeagueAdministratorsSettings({
  leagues,
}: {
  leagues: readonly MyLeaguesApiItem[];
}) {
  const [leagueId, setLeagueId] = useState(leagues[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminsPayload | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!leagueId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/admins`, {
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        admins?: AdminRow[];
        viewerIsSuperuser?: boolean;
        superuserUserId?: string;
      };
      if (!res.ok) {
        setData(null);
        setError(typeof json.error === "string" ? json.error : "No se pudo cargar.");
        return;
      }
      if (
        !Array.isArray(json.admins) ||
        typeof json.viewerIsSuperuser !== "boolean" ||
        typeof json.superuserUserId !== "string"
      ) {
        setData(null);
        setError("Respuesta inválida del servidor.");
        return;
      }
      setData({
        superuserUserId: json.superuserUserId,
        viewerIsSuperuser: json.viewerIsSuperuser,
        admins: json.admins,
      });
    } catch {
      setData(null);
      setError("Error de red al cargar administradores.");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (leagues.length === 0) return;
    setLeagueId((prev) => (leagues.some((l) => l.id === prev) ? prev : leagues[0]!.id));
  }, [leagues]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!leagueId || !email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/admins`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "No se pudo agregar.");
        return;
      }
      setEmail("");
      await load();
    } catch {
      setError("Error de red al agregar administrador.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onRemove(targetUserId: string) {
    if (!leagueId) return;
    setRemovingId(targetUserId);
    setError(null);
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/admins/${encodeURIComponent(targetUserId)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "No se pudo quitar.");
        return;
      }
      await load();
    } catch {
      setError("Error de red al quitar administrador.");
    } finally {
      setRemovingId(null);
    }
  }

  if (leagues.length === 0) {
    return null;
  }

  return (
    <div className={`${floatCard} flex flex-col gap-4 p-4 sm:p-5`}>
      <div>
        <h2 className="text-base font-semibold tracking-tight">Administradores del panel</h2>
        <p className="text-foreground-muted mt-1 text-sm leading-relaxed">
          Varias personas pueden gestionar la misma liga. Solo quien creó la organización puede
          quitar administradores invitados.
        </p>
      </div>

      {leagues.length > 1 ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-foreground-muted font-medium">Liga</span>
          <select
            className="border-border bg-background focus:ring-brand-teal/30 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            value={leagueId}
            onChange={(ev) => setLeagueId(ev.target.value)}
          >
            {leagues.map((L) => (
              <option key={L.id} value={L.id}>
                {L.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {error ? (
        <p className="text-brand-purple text-sm font-medium" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-foreground-muted text-sm">Cargando…</p>
      ) : data ? (
        <ul className="divide-border divide-y rounded-lg border">
          {data.admins.map((a) => (
            <li
              key={a.userId}
              className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{a.email}</p>
                {a.displayName ? (
                  <p className="text-foreground-muted truncate text-xs">{a.displayName}</p>
                ) : null}
                <div className="mt-1 flex flex-wrap gap-2">
                  {a.isSuperuser ? (
                    <span className="bg-brand-lime/25 text-brand-navy rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                      Propietario
                    </span>
                  ) : (
                    <span className="bg-brand-blue/15 text-brand-teal border-brand-blue/25 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                      Administrador
                    </span>
                  )}
                </div>
              </div>
              {!a.isSuperuser && data.viewerIsSuperuser ? (
                <button
                  type="button"
                  disabled={removingId === a.userId}
                  onClick={() => void onRemove(a.userId)}
                  className="text-brand-purple hover:text-foreground shrink-0 text-sm font-semibold underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {removingId === a.userId ? "Quitando…" : "Quitar"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={(ev) => void onAdd(ev)} className="flex flex-col gap-3 border-t border-border pt-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-foreground-muted font-medium">Agregar por correo</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="border-border bg-background focus:ring-brand-teal/30 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
          />
        </label>
        <button
          type="submit"
          disabled={submitting || !email.trim() || !leagueId}
          className="bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          {submitting ? "Agregando…" : "Agregar administrador"}
        </button>
        <p className="text-foreground-muted text-xs leading-relaxed">
          El correo debe ser de una cuenta ya registrada en Tornea. Si aún estaba en lista de
          espera, al agregarlo como administrador también se le habilita el acceso al panel. Mismas
          capacidades que el propietario, salvo quitar a otros administradores.
        </p>
      </form>
    </div>
  );
}
