"use client";

import { useEffect, useRef, useState } from "react";

import type { MyLeaguesApiItem } from "./my-leagues-state";
import {
  LEAGUE_SHIELD_ACCEPT_ATTR,
  LEAGUE_SHIELD_MAX_FILE_BYTES,
  LEAGUE_SHIELD_MIME_TYPES,
} from "./league-shield-constraints";
import {
  newVenueFormFieldsSchema,
  venueSurfacePresetOptions,
  type VenueSurfacePreset,
} from "./new-venue-form-schema";

type NewVenueFormProps = {
  leagues: readonly MyLeaguesApiItem[];
  onClose: () => void;
  onVenueCreated?: () => void;
  onBusyChange?: (busy: boolean) => void;
  editTarget?: { leagueId: string; venueId: string } | null;
};

export function NewVenueForm({
  leagues,
  onClose,
  onVenueCreated,
  onBusyChange,
  editTarget = null,
}: NewVenueFormProps) {
  const isEdit = Boolean(editTarget);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(() =>
    isEdit ? "loading" : "ready",
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const [leagueId, setLeagueId] = useState(() => {
    if (editTarget) return editTarget.leagueId;
    return leagues.length === 1 ? leagues[0]!.id : "";
  });
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [surfacePreset, setSurfacePreset] = useState<VenueSurfacePreset>("synthetic_fifa2");
  const [surfaceCustom, setSurfaceCustom] = useState("");
  const [availabilityNotes, setAvailabilityNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotoCount, setExistingPhotoCount] = useState(0);
  const [clearExistingPhotos, setClearExistingPhotos] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onBusyChange?.(submitting || (isEdit && loadState === "loading"));
  }, [submitting, loadState, isEdit, onBusyChange]);

  useEffect(() => {
    return () => {
      onBusyChange?.(false);
    };
  }, [onBusyChange]);

  useEffect(() => {
    if (isEdit) return;
    if (leagues.length === 1) {
      queueMicrotask(() => setLeagueId(leagues[0]!.id));
    }
  }, [leagues, isEdit]);

  useEffect(() => {
    if (!isEdit || !editTarget) {
      queueMicrotask(() => {
        setLoadState("ready");
        setLoadError(null);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoadState("loading");
      setLoadError(null);
    });

    void (async () => {
      try {
        const res = await fetch(
          `/api/leagues/${encodeURIComponent(editTarget.leagueId)}/venues/${encodeURIComponent(editTarget.venueId)}`,
        );
        let data: {
          venue?: {
            name: string;
            address: string;
            surfacePreset: VenueSurfacePreset;
            surfaceCustom: string;
            availabilityNotes: string;
            existingPhotoCount: number;
          };
          error?: string;
        } = {};
        try {
          data = (await res.json()) as typeof data;
        } catch {
          /* ignore */
        }

        if (cancelled) return;

        if (res.status === 401) {
          window.location.href = "/";
          return;
        }

        if (!res.ok || !data.venue) {
          setLoadError(
            typeof data.error === "string" ? data.error : "No se pudo cargar la cancha.",
          );
          setLoadState("error");
          return;
        }

        const v = data.venue;
        setLeagueId(editTarget.leagueId);
        setName(v.name);
        setAddress(v.address);
        setSurfacePreset(v.surfacePreset);
        setSurfaceCustom(v.surfaceCustom);
        setAvailabilityNotes(v.availabilityNotes);
        setExistingPhotoCount(v.existingPhotoCount);
        setClearExistingPhotos(false);
        setPhotos([]);
        setPhotosError(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setLoadState("ready");
      } catch {
        if (!cancelled) {
          setLoadError("Error de red al cargar la cancha.");
          setLoadState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, editTarget]);

  function resetForm() {
    setName("");
    setAddress("");
    setSurfacePreset("synthetic_fifa2");
    setSurfaceCustom("");
    setAvailabilityNotes("");
    setPhotos([]);
    setExistingPhotoCount(0);
    setClearExistingPhotos(false);
    setFieldErrors({});
    setPhotosError(null);
    setSubmitError(null);
    if (!isEdit) {
      setLeagueId(leagues.length === 1 ? leagues[0]!.id : "");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onPhotoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotosError(null);
    const list = e.target.files ? Array.from(e.target.files) : [];
    const next: File[] = [];
    for (const f of list) {
      if (f.size > LEAGUE_SHIELD_MAX_FILE_BYTES) {
        setPhotosError("Cada imagen debe ser de hasta 2 MiB.");
        return;
      }
      if (!LEAGUE_SHIELD_MIME_TYPES.has(f.type)) {
        setPhotosError("Solo JPG, PNG o WebP.");
        return;
      }
      next.push(f);
    }
    const maxNew = isEdit
      ? Math.max(0, 8 - (clearExistingPhotos ? 0 : existingPhotoCount))
      : 8;
    if (next.length > maxNew) {
      setPhotosError(
        isEdit
          ? `Podés subir hasta ${maxNew} imagen(es) más (máx. 8 en total).`
          : "Máximo 8 fotos.",
      );
      return;
    }
    setPhotos(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setPhotosError(null);
    setSubmitError(null);

    if (!leagueId) {
      setFieldErrors({ leagueId: "Elegí una liga." });
      return;
    }

    const body = {
      name: name.trim(),
      address: address.trim(),
      surfacePreset,
      surfaceCustom: surfaceCustom.trim(),
      availabilityNotes: availabilityNotes.trim(),
    };

    const parsed = newVenueFormFieldsSchema.safeParse(body);
    if (!parsed.success) {
      const err: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && err[key] === undefined) {
          err[key] = issue.message;
        }
      }
      setFieldErrors(err);
      return;
    }

    if (isEdit) {
      const kept = clearExistingPhotos ? 0 : existingPhotoCount;
      if (kept + photos.length > 8) {
        setPhotosError(`Máximo 8 fotos en total (${kept} actuales + ${photos.length} nuevas).`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", parsed.data.name);
      formData.append("address", parsed.data.address);
      formData.append("surfacePreset", parsed.data.surfacePreset);
      formData.append("surfaceCustom", parsed.data.surfaceCustom ?? "");
      formData.append("availabilityNotes", parsed.data.availabilityNotes ?? "");
      for (const f of photos) {
        formData.append("photos", f);
      }

      const url = isEdit
        ? `/api/leagues/${encodeURIComponent(editTarget!.leagueId)}/venues/${encodeURIComponent(editTarget!.venueId)}`
        : `/api/leagues/${encodeURIComponent(leagueId)}/venues`;

      if (isEdit) {
        formData.append("clearExistingPhotos", clearExistingPhotos ? "true" : "");
      }

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        body: formData,
      });

      let data: { error?: string; fields?: Record<string, string> } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        /* ignore */
      }

      if (res.status === 401) {
        window.location.href = "/";
        return;
      }

      if (!res.ok) {
        if (data.fields && typeof data.fields === "object") {
          setFieldErrors(data.fields);
        }
        if (data.fields?.photos) {
          setPhotosError(data.fields.photos);
        }
        setSubmitError(
          typeof data.error === "string"
            ? data.error
            : isEdit
              ? "No se pudo guardar los cambios."
              : "No se pudo guardar la cancha. Intentá de nuevo.",
        );
        return;
      }

      onVenueCreated?.();
      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const selectedLeague = leagues.find((l) => l.id === leagueId);

  if (isEdit && loadState === "loading") {
    return (
      <div className="text-foreground-muted py-8 text-center text-sm">Cargando cancha…</div>
    );
  }

  if (isEdit && loadState === "error") {
    return (
      <div className="w-full space-y-4">
        <p className="text-brand-navy bg-brand-purple/15 border-border rounded-brand-md border px-3 py-2.5 text-sm">
          {loadError ?? "No se pudo cargar."}
        </p>
        <button
          type="button"
          className="border-border text-foreground-muted hover:text-foreground rounded-full border px-5 py-2.5 text-sm font-medium"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="text-foreground-muted mb-6 text-sm leading-relaxed">
        {isEdit ? (
          <>
            Modificá los datos de la cancha en{" "}
            <code className="text-foreground-muted text-xs">venues</code>. Las fotos nuevas se suman
            a las existentes (máx. 8) salvo que marques quitar todas.
          </>
        ) : (
          <>
            La cancha queda en <code className="text-foreground-muted text-xs">venues</code> de la
            liga elegida. La superficie y la disponibilidad opcional se guardan en{" "}
            <code className="text-foreground-muted text-xs">metadata</code>; las fotos van a
            Storage.
          </>
        )}
      </p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {submitError ? (
          <div className="border-border bg-brand-purple/15 text-brand-navy rounded-brand-md border px-3 py-2.5 text-sm">
            {submitError}
          </div>
        ) : null}

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Liga</span>
          <div className="relative mt-1">
            <select
              name="leagueId"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              required={leagues.length > 0}
              disabled={leagues.length === 0 || isEdit}
              className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 hover:border-brand-teal/40 w-full cursor-pointer appearance-none rounded-brand-md border px-3 py-2 pr-10 text-sm outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
              aria-invalid={!!fieldErrors.leagueId}
            >
              {leagues.length === 0 ? (
                <option value="">No tenés ligas</option>
              ) : (
                <>
                  {!isEdit ? (
                    <option value="" disabled>
                      Elegí una liga…
                    </option>
                  ) : null}
                  {leagues.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            <span
              className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
              aria-hidden
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-70"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </div>
          {fieldErrors.leagueId ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.leagueId}</span>
          ) : selectedLeague ? (
            <span className="text-foreground-subtle mt-1 block text-[10px]">
              {isEdit ? "Liga fija para esta cancha." : `Liga seleccionada: ${selectedLeague.name}`}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Nombre de cancha</span>
          <input
            type="text"
            name="venueName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="off"
            className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
            aria-invalid={!!fieldErrors.name}
          />
          {fieldErrors.name ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.name}</span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Dirección</span>
          <input
            type="text"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            autoComplete="street-address"
            className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
            aria-invalid={!!fieldErrors.address}
          />
          {fieldErrors.address ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.address}</span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Tipo de superficie</span>
          <div className="relative mt-1">
            <select
              name="surfacePreset"
              value={surfacePreset}
              onChange={(e) => setSurfacePreset(e.target.value as VenueSurfacePreset)}
              className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 hover:border-brand-teal/40 w-full cursor-pointer appearance-none rounded-brand-md border px-3 py-2 pr-10 text-sm outline-none transition-colors focus-visible:ring-2"
              aria-invalid={!!fieldErrors.surfacePreset}
            >
              {venueSurfacePresetOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span
              className="text-foreground-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
              aria-hidden
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-70"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </div>
          {fieldErrors.surfacePreset ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.surfacePreset}</span>
          ) : null}
        </label>

        {surfacePreset === "other" ? (
          <label className="block">
            <span className="text-foreground-muted text-xs font-medium">Describe la superficie</span>
            <input
              type="text"
              name="surfaceCustom"
              value={surfaceCustom}
              onChange={(e) => setSurfaceCustom(e.target.value)}
              required
              autoComplete="off"
              placeholder="Ej. Goma eva, pasto sintético 7x7…"
              className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
              aria-invalid={!!fieldErrors.surfaceCustom}
            />
            {fieldErrors.surfaceCustom ? (
              <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.surfaceCustom}</span>
            ) : null}
          </label>
        ) : null}

        <div className="border-border rounded-brand-md border px-3 py-3">
          <span className="text-foreground-muted text-xs font-medium">Fotos</span>
          {isEdit && existingPhotoCount > 0 ? (
            <p className="text-foreground-subtle mt-2 text-xs">
              Hay {existingPhotoCount} foto{existingPhotoCount === 1 ? "" : "s"} guardada
              {existingPhotoCount === 1 ? "" : "s"}.
            </p>
          ) : null}
          {isEdit && existingPhotoCount > 0 ? (
            <label className="text-foreground-muted mt-2 flex cursor-pointer items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={clearExistingPhotos}
                onChange={(e) => {
                  setClearExistingPhotos(e.target.checked);
                  setPhotosError(null);
                }}
                className="border-border mt-0.5 size-4 shrink-0 rounded"
              />
              <span>Quitar todas las fotos existentes al guardar</span>
            </label>
          ) : null}
          <label className="mt-3 block">
            <span className="text-foreground-muted text-xs font-medium">
              {isEdit ? "Agregar imágenes (opcional)" : "Fotos (opcional)"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              name="photos"
              accept={LEAGUE_SHIELD_ACCEPT_ATTR}
              multiple
              onChange={onPhotoInputChange}
              className="border-border bg-surface-code/40 mt-1 w-full cursor-pointer rounded-brand-md border px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
            {photosError ? (
              <span className="text-brand-purple mt-1 block text-xs">{photosError}</span>
            ) : (
              <span className="text-foreground-subtle mt-1 block text-[10px] leading-relaxed">
                {isEdit
                  ? `Hasta 8 en total. JPG, PNG o WebP, 2 MiB c/u.`
                  : "Hasta 8 imágenes, 2 MiB c/u. JPG, PNG o WebP."}
              </span>
            )}
            {photos.length > 0 ? (
              <span className="text-foreground-muted mt-1 block text-xs">
                {photos.length} archivo{photos.length === 1 ? "" : "s"} nuevo
                {photos.length === 1 ? "" : "s"} para subir
              </span>
            ) : null}
          </label>
        </div>

        <label className="block">
          <span className="text-foreground-muted text-xs font-medium">Disponibilidad (opcional)</span>
          <textarea
            name="availabilityNotes"
            value={availabilityNotes}
            onChange={(e) => setAvailabilityNotes(e.target.value)}
            rows={4}
            placeholder="Horarios habituales, días cerrados, reservas…"
            className="border-border bg-surface-code/40 mt-1 w-full resize-y rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
            aria-invalid={!!fieldErrors.availabilityNotes}
          />
          {fieldErrors.availabilityNotes ? (
            <span className="text-brand-purple mt-1 block text-xs">
              {fieldErrors.availabilityNotes}
            </span>
          ) : (
            <span className="text-foreground-subtle mt-1 block text-[10px]">
              Texto libre; se guarda en{" "}
              <code className="text-foreground-muted">metadata.availabilityNotes</code>.
            </span>
          )}
        </label>

        <div className="border-border mt-2 flex flex-wrap gap-3 border-t pt-5">
          <button
            type="button"
            className="border-border text-foreground-muted hover:text-foreground rounded-full border px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            disabled={submitting || leagues.length === 0}
          >
            {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar cancha"}
          </button>
        </div>
      </form>
    </div>
  );
}
