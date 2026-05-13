"use client";

import { useCallback, useEffect, useState } from "react";

type SheetApiPayload = {
  player: {
    id: string;
    fullName: string;
    birthDate: string;
    photoUrl: string | null;
    photoFileName: string | null;
    curpUploaded: boolean;
    curpDownloadUrl: string | null;
    curpFileName: string | null;
  };
  context: {
    leagueId: string;
    leagueName: string;
    sportLabel: string;
    teamId: string;
    teamName: string;
    teamShort: string | null;
    shirtNumber: number | null;
    position: string | null;
    positionLabel: string;
    rosterRegisteredAt: string | null;
    leagueCategoryName: string | null;
  };
  stats: {
    appearances: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    penaltiesTaken: number;
    penaltiesScored: number;
  };
};

export type PlayerTechnicalSheetPanelProps = {
  leagueId: string;
  teamId: string;
  playerId: string;
  onClose: () => void;
  onRequestEdit: () => void;
};

function playerInitial(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "?";
  const first = [...t][0];
  return first ? first.toLocaleUpperCase("es") : "?";
}

function birthDisplay(iso: string): string | null {
  const raw = iso?.trim();
  if (!raw) return null;
  const [y, m, d] = raw.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  try {
    return new Intl.DateTimeFormat("es", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(Date.UTC(y, m - 1, d)));
  } catch {
    return raw;
  }
}

function rosterRegisteredDisplay(iso: string | null | undefined): string | null {
  const raw = iso?.trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return null;
  }
}

function safeDownloadFilename(name: string | null | undefined, fallback: string): string {
  const n = (name ?? "").trim();
  const base = n || fallback;
  const cleaned = base.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "-").slice(0, 180);
  return cleaned || fallback;
}

function fallbackPhotoDownloadName(fullName: string): string {
  const slug = fullName
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return slug ? `${slug}-foto.jpg` : "foto-jugador.jpg";
}

function fallbackCurpDownloadName(fullName: string): string {
  const slug = fullName
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return slug ? `${slug}-identificacion` : "identificacion";
}

async function triggerBrowserDownload(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) {
    throw new Error("HTTP error");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

function ageYears(iso: string): number | null {
  const raw = iso?.trim();
  if (!raw) return null;
  const [y, m, d] = raw.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const born = new Date(Date.UTC(y, m - 1, d));
  const t = new Date();
  let age = t.getUTCFullYear() - born.getUTCFullYear();
  const md = t.getUTCMonth() - born.getUTCMonth();
  if (md < 0 || (md === 0 && t.getUTCDate() < born.getUTCDate())) {
    age--;
  }
  return age >= 0 && age < 130 ? age : null;
}

function StatTile({
  label,
  value,
  accent = "amber",
  hint,
}: {
  label: string;
  value: number | string;
  accent?: "amber" | "slate";
  hint?: string;
}) {
  const accentClass =
    accent === "amber"
      ? "text-amber-200 tabular-nums drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]"
      : "text-foreground tabular-nums";
  return (
    <div className="border-border/60 bg-background/40 hover:border-amber-500/25 relative overflow-hidden rounded-xl border px-3 py-3 transition-colors">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgba(251,191,36,0.9) 0%, transparent 55%)",
        }}
      />
      <p className="text-foreground-muted relative text-[10px] font-bold tracking-[0.22em] uppercase">
        {label}
      </p>
      <p className={`relative mt-1 text-2xl font-black tracking-tight ${accentClass}`}>{value}</p>
      {hint ? (
        <p className="text-foreground-subtle relative mt-1 text-[10px] font-medium leading-tight">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PlayerTechnicalSheetPanel({
  leagueId,
  teamId,
  playerId,
  onClose,
  onRequestEdit,
}: PlayerTechnicalSheetPanelProps) {
  const [sheet, setSheet] = useState<SheetApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState<null | "photo" | "curp">(null);
  const [downloadNote, setDownloadNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDownloadNote(null);
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/teams/${encodeURIComponent(teamId)}/players/${encodeURIComponent(playerId)}/sheet`,
        { method: "GET" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "No se pudo cargar la ficha.");
        setSheet(null);
        return;
      }
      const data = (await res.json()) as { sheet?: Partial<SheetApiPayload> };
      const raw = data.sheet;
      if (!raw?.player?.id || !raw.context?.leagueId) {
        setError("Respuesta incompleta del servidor.");
        setSheet(null);
        return;
      }

      const n = (v: unknown) => {
        const x = Number(v);
        return Number.isFinite(x) ? Math.trunc(x) : 0;
      };

      setSheet({
        player: {
          id: raw.player.id,
          fullName: raw.player.fullName?.trim() || "Sin nombre",
          birthDate: typeof raw.player.birthDate === "string" ? raw.player.birthDate : "",
          photoUrl: raw.player.photoUrl ?? null,
          photoFileName:
            typeof raw.player.photoFileName === "string" && raw.player.photoFileName.trim()
              ? raw.player.photoFileName.trim()
              : null,
          curpUploaded: Boolean(raw.player.curpUploaded),
          curpDownloadUrl:
            typeof raw.player.curpDownloadUrl === "string" && raw.player.curpDownloadUrl.trim()
              ? raw.player.curpDownloadUrl.trim()
              : null,
          curpFileName:
            typeof raw.player.curpFileName === "string" && raw.player.curpFileName.trim()
              ? raw.player.curpFileName.trim()
              : null,
        },
        context: {
          leagueId: raw.context.leagueId ?? "",
          leagueName: raw.context.leagueName?.trim() || "Liga",
          sportLabel: raw.context.sportLabel?.trim() || "Deporte",
          teamId: raw.context.teamId ?? "",
          teamName: raw.context.teamName?.trim() || "Equipo",
          teamShort: raw.context.teamShort ?? null,
          shirtNumber:
            raw.context.shirtNumber != null && Number.isFinite(Number(raw.context.shirtNumber))
              ? Number(raw.context.shirtNumber)
              : null,
          position: raw.context.position?.trim() || null,
          positionLabel:
            typeof raw.context.positionLabel === "string" && raw.context.positionLabel.trim()
              ? raw.context.positionLabel.trim()
              : "—",
          rosterRegisteredAt:
            typeof raw.context.rosterRegisteredAt === "string" &&
            raw.context.rosterRegisteredAt.trim()
              ? raw.context.rosterRegisteredAt.trim()
              : null,
          leagueCategoryName:
            typeof raw.context.leagueCategoryName === "string" &&
            raw.context.leagueCategoryName.trim()
              ? raw.context.leagueCategoryName.trim()
              : null,
        },
        stats: {
          appearances: n(raw.stats?.appearances),
          goals: n(raw.stats?.goals),
          assists: n(raw.stats?.assists),
          yellowCards: n(raw.stats?.yellowCards),
          redCards: n(raw.stats?.redCards),
          penaltiesTaken: n(raw.stats?.penaltiesTaken),
          penaltiesScored: n(raw.stats?.penaltiesScored),
        },
      });
    } catch {
      setError("Error de red.");
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [leagueId, teamId, playerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const [photoBroken, setPhotoBroken] = useState(false);
  useEffect(() => {
    setPhotoBroken(false);
  }, [sheet?.player.photoUrl]);

  const downloadPhoto = useCallback(async () => {
    const s = sheet;
    if (!s) return;
    const url = s.player.photoUrl?.trim();
    if (!url) return;
    setDownloadBusy("photo");
    setDownloadNote(null);
    try {
      const fn = safeDownloadFilename(
        s.player.photoFileName,
        fallbackPhotoDownloadName(s.player.fullName),
      );
      await triggerBrowserDownload(url, fn);
    } catch {
      setDownloadNote("No se pudo descargar la foto.");
    } finally {
      setDownloadBusy(null);
    }
  }, [sheet]);

  const downloadCurp = useCallback(async () => {
    const s = sheet;
    if (!s) return;
    const url = s.player.curpDownloadUrl?.trim();
    if (!url) return;
    setDownloadBusy("curp");
    setDownloadNote(null);
    try {
      const fn = safeDownloadFilename(
        s.player.curpFileName,
        `${fallbackCurpDownloadName(s.player.fullName)}.pdf`,
      );
      await triggerBrowserDownload(url, fn);
    } catch {
      setDownloadNote("No se pudo descargar la identificación.");
    } finally {
      setDownloadBusy(null);
    }
  }, [sheet]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16">
        <div
          className="border-brand-teal size-10 animate-spin rounded-full border-2 border-t-transparent"
          aria-hidden
        />
        <p className="text-foreground-muted text-sm font-medium">Cargando ficha técnica…</p>
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="flex min-h-[32vh] flex-col items-center justify-center gap-4 py-10">
        <p className="text-foreground-muted max-w-sm text-center text-sm">{error}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="bg-brand-teal hover:bg-brand-teal/90 rounded-full px-4 py-2 text-xs font-bold text-white"
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border-border hover:bg-surface-code/60 rounded-full border px-4 py-2 text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const { player, context, stats } = sheet;
  const birthStr = birthDisplay(player.birthDate);
  const age = ageYears(player.birthDate);
  const posLabel = context.positionLabel?.trim() || "—";
  const posDisplay = posLabel === "—" ? "—" : posLabel.toLocaleUpperCase("es");
  const shirtLabel =
    context.shirtNumber != null ? String(context.shirtNumber).padStart(2, "0") : "—";

  const photoUrl = player.photoUrl?.trim() ?? "";
  const showPhoto = photoUrl.length > 0 && !photoBroken;
  const canDownloadPhoto = photoUrl.length > 0;
  const canDownloadCurp = Boolean(player.curpDownloadUrl?.trim());

  return (
    <div className="flex flex-col gap-0 pb-6">
      <section className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-[#071426] via-[#0b1f3a] to-brand-navy text-white shadow-[0_0_0_1px_rgba(251,191,36,0.08)_inset]">
        <div className="h-1 w-full bg-gradient-to-r from-amber-700 via-amber-300 to-amber-700" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, white 0.5px, transparent 0.6px)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative flex flex-col gap-6 px-5 py-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-end">
            <div className="shrink-0">
              <div className="ring-amber-400/35 relative size-[7.5rem] overflow-hidden rounded-2xl bg-black/30 shadow-xl ring-2">
                {showPhoto ? (
                  <img
                    src={photoUrl}
                    alt=""
                    className="size-full object-cover object-center"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setPhotoBroken(true)}
                  />
                ) : (
                  <div className="from-brand-teal/50 flex size-full items-center justify-center bg-gradient-to-br to-amber-900/40 text-3xl font-black text-white">
                    {playerInitial(player.fullName)}
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 pb-0.5">
              <p className="text-amber-200/90 mb-1 text-[10px] font-bold tracking-[0.35em] uppercase">
                {context.sportLabel}
              </p>
              <h3 className="text-[1.65rem] leading-[1.15] font-black tracking-tight text-white drop-shadow-sm sm:text-4xl">
                {player.fullName}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-white/85">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-white/50">Club</span>
                  <span className="truncate">{context.teamName}</span>
                </span>
                <span className="text-white/35 hidden sm:inline" aria-hidden>
                  ·
                </span>
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <span className="text-white/50 shrink-0">Categoría</span>
                  <span className="truncate">{context.leagueCategoryName ?? "—"}</span>
                </span>
                <span className="text-white/35 hidden sm:inline" aria-hidden>
                  ·
                </span>
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <span className="text-white/50 shrink-0">Liga</span>
                  <span className="truncate">{context.leagueName}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            <div className="border-white/15 bg-black/25 flex min-w-[5rem] flex-col rounded-xl border px-4 py-3 text-center backdrop-blur-sm">
              <span className="text-[10px] font-bold tracking-wider text-amber-200/90 uppercase">
                Número
              </span>
              <span className="mt-0.5 text-3xl font-black tabular-nums text-white">{shirtLabel}</span>
            </div>
            <div className="border-white/15 bg-black/25 flex min-w-[6.5rem] max-w-[14rem] flex-col rounded-xl border px-3 py-3 text-center backdrop-blur-sm">
              <span className="text-[10px] font-bold tracking-wider text-amber-200/90 uppercase">
                Posición
              </span>
              <span className="mt-0.5 break-words text-sm leading-snug font-bold tracking-tight text-white sm:text-base">
                {posDisplay}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-border/70 mt-6 rounded-2xl border bg-surface-code/25 px-4 py-4">
        <h4 className="text-foreground-muted mb-3 text-[11px] font-bold tracking-[0.2em] uppercase">
          Datos personales
        </h4>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="flex justify-between gap-4 rounded-lg bg-background/60 px-3 py-2">
            <dt className="text-foreground-muted text-xs font-semibold">Nacimiento</dt>
            <dd className="text-right text-sm font-medium">{birthStr ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 rounded-lg bg-background/60 px-3 py-2">
            <dt className="text-foreground-muted text-xs font-semibold">Edad</dt>
            <dd className="text-right text-sm font-medium">{age != null ? `${age} años` : "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 rounded-lg bg-background/60 px-3 py-2">
            <dt className="text-foreground-muted max-w-[45%] text-xs font-semibold leading-snug">
              Identificación{" "}
              <span className="text-foreground-subtle font-normal"></span>
            </dt>
            <dd className="text-right text-sm font-semibold tabular-nums">
              {player.curpUploaded ? (
                <span className="text-amber-500" title="Documento CURP cargado" aria-label="Sí">
                  ✓
                </span>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 rounded-lg bg-background/60 px-3 py-2">
            <dt className="text-foreground-muted text-xs font-semibold">Alta en plantilla</dt>
            <dd className="text-right text-sm font-medium">
              {rosterRegisteredDisplay(context.rosterRegisteredAt) ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 rounded-lg bg-background/60 px-3 py-2">
            <dt className="text-foreground-muted text-xs font-semibold">Categoría</dt>
            <dd className="text-right text-sm font-medium">{context.leagueCategoryName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 rounded-lg bg-background/60 px-3 py-2">
            <dt className="text-foreground-muted text-xs font-semibold">Club</dt>
            <dd className="text-right text-sm font-medium">{context.teamName}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h4 className="text-foreground-muted text-[11px] font-bold tracking-[0.2em] uppercase">
            Rendimiento en la liga
          </h4>
          <p className="text-foreground-subtle max-w-md text-[11px] leading-snug">
            Todas las temporadas · solo partidos en vivo, finalizados o walkover · goles sin autogol ·
            penaltis: máximo reglamentario (no tanda).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatTile label="Partidos" value={stats.appearances} />
          <StatTile label="Goles" value={stats.goals} accent="amber" />
          <StatTile label="Asistencias" value={stats.assists} />
          <StatTile
            label="Penaltis"
            value={`${stats.penaltiesScored}/${stats.penaltiesTaken}`}
            accent="amber"
            hint="Anotados / lanzados"
          />
          <StatTile label="Amarillas" value={stats.yellowCards} accent="slate" />
          <StatTile label="Rojas" value={stats.redCards} accent="slate" />
        </div>
      </section>

      <div className="border-border mt-8 flex flex-col gap-4 border-t pt-5">
        {downloadNote ? (
          <p className="text-brand-purple text-xs font-medium">{downloadNote}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canDownloadCurp || downloadBusy === "curp"}
            aria-busy={downloadBusy === "curp"}
            onClick={() => void downloadCurp()}
            className="border-border bg-background-muted/40 rounded-full border px-4 py-2 text-xs font-semibold transition-[transform,box-shadow,background-color,border-color] duration-150 enabled:cursor-pointer enabled:hover:border-brand-teal/50 enabled:hover:bg-surface-code/60 enabled:hover:shadow-sm enabled:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
          >
            {downloadBusy === "curp" ? "Descargando…" : "Descargar identificación"}
          </button>
          <button
            type="button"
            disabled={!canDownloadPhoto || downloadBusy === "photo"}
            aria-busy={downloadBusy === "photo"}
            onClick={() => void downloadPhoto()}
            className="border-border bg-background-muted/40 rounded-full border px-4 py-2 text-xs font-semibold transition-[transform,box-shadow,background-color,border-color] duration-150 enabled:cursor-pointer enabled:hover:border-brand-teal/50 enabled:hover:bg-surface-code/60 enabled:hover:shadow-sm enabled:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
          >
            {downloadBusy === "photo" ? "Descargando…" : "Descargar foto"}
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-foreground-subtle text-xs leading-relaxed">
            Editá dorsal, foto, datos de contacto y documentación desde el formulario del jugador.
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border-border hover:bg-surface-code/50 rounded-full border px-4 py-2 text-xs font-semibold"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={onRequestEdit}
              className="rounded-full bg-amber-500 px-5 py-2 text-xs font-black tracking-wide text-[#0a1628] shadow-sm hover:bg-amber-400"
            >
              Editar datos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
