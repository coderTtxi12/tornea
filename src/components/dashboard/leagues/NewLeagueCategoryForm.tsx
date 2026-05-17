"use client";

import { useEffect, useRef, useState } from "react";

import {
  leagueCategoryGenderOptions,
  newLeagueCategoryJsonSchema,
} from "./new-league-category-form-schema";

type NewLeagueCategoryFormProps = {
  leagueId: string;
  leagueName: string;
  onClose: () => void;
  onCategoryCreated?: () => void;
  onBusyChange?: (busy: boolean) => void;
  editTarget?: { leagueId: string; categoryId: string } | null;
};

function parseOptionalBirthYear(raw: string): number | null | "invalid" {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1000 || n > 9999) return "invalid";
  return n;
}

function parseOptionalPositiveInt(raw: string): number | null | "invalid" {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1) return "invalid";
  return n;
}

export function NewLeagueCategoryForm({
  leagueId,
  leagueName,
  onClose,
  onCategoryCreated,
  onBusyChange,
  editTarget = null,
}: NewLeagueCategoryFormProps) {
  const isEdit = Boolean(editTarget);
  const idempotencyKeyRef = useRef<string | null>(null);

  const [codeReadOnly, setCodeReadOnly] = useState("");
  const [editLoadState, setEditLoadState] = useState<"idle" | "loading" | "ready" | "error">(
    () => (isEdit ? "loading" : "ready"),
  );
  const [editLoadError, setEditLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [gender, setGender] = useState<(typeof leagueCategoryGenderOptions)[number]["value"]>(
    "male",
  );
  const [birthYearMinStr, setBirthYearMinStr] = useState("");
  const [birthYearMaxStr, setBirthYearMaxStr] = useState("");
  const [minTeamsStr, setMinTeamsStr] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchEditLeagueId = editTarget?.leagueId ?? null;
  const fetchEditCategoryId = editTarget?.categoryId ?? null;

  useEffect(() => {
    if (!fetchEditLeagueId || !fetchEditCategoryId) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setEditLoadState("loading");
      setEditLoadError(null);

      void (async () => {
        try {
          const res = await fetch(
            `/api/leagues/${encodeURIComponent(fetchEditLeagueId)}/categories/${encodeURIComponent(fetchEditCategoryId)}`,
          );
          let data: {
            category?: {
              code: string;
              name: string;
              gender: (typeof leagueCategoryGenderOptions)[number]["value"];
              birthYearMin: number | null;
              birthYearMax: number | null;
              minTeamsToStart: number | null;
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
          if (!res.ok || !data.category) {
            setEditLoadError(
              typeof data.error === "string" ? data.error : "No se pudo cargar la categoría.",
            );
            setEditLoadState("error");
            return;
          }
          const c = data.category;
          setCodeReadOnly(c.code);
          setName(c.name);
          setGender(c.gender);
          setBirthYearMinStr(c.birthYearMin == null ? "" : String(c.birthYearMin));
          setBirthYearMaxStr(c.birthYearMax == null ? "" : String(c.birthYearMax));
          setMinTeamsStr(c.minTeamsToStart == null ? "" : String(c.minTeamsToStart));
          setEditLoadState("ready");
        } catch {
          if (!cancelled) {
            setEditLoadError("Error de red al cargar la categoría.");
            setEditLoadState("error");
          }
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [fetchEditLeagueId, fetchEditCategoryId]);

  useEffect(() => {
    onBusyChange?.(submitting);
  }, [submitting, onBusyChange]);

  useEffect(() => {
    return () => {
      onBusyChange?.(false);
    };
  }, [onBusyChange]);

  function resetForm() {
    setName("");
    setGender("male");
    setBirthYearMinStr("");
    setBirthYearMaxStr("");
    setMinTeamsStr("");
    setFieldErrors({});
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    const nextErrors: Record<string, string> = {};
    const birthYearMin = parseOptionalBirthYear(birthYearMinStr);
    const birthYearMax = parseOptionalBirthYear(birthYearMaxStr);
    const minTeams = parseOptionalPositiveInt(minTeamsStr);

    if (birthYearMin === "invalid") {
      nextErrors.birthYearMin = "Indica un año de 4 dígitos o dejá vacío.";
    }
    if (birthYearMax === "invalid") {
      nextErrors.birthYearMax = "Indica un año de 4 dígitos o dejá vacío.";
    }
    if (minTeams === "invalid") {
      nextErrors.minTeamsToStart = "Indica un entero ≥ 1 o dejá vacío.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const body = {
      name: name.trim(),
      gender,
      birthYearMin: birthYearMin as number | null,
      birthYearMax: birthYearMax as number | null,
      minTeamsToStart: minTeams as number | null,
    };

    const parsed = newLeagueCategoryJsonSchema.safeParse(body);
    if (!parsed.success) {
      const zErr: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && zErr[key] === undefined) {
          zErr[key] = issue.message;
        }
      }
      setFieldErrors(zErr);
      return;
    }

    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/leagues/${encodeURIComponent(fetchEditLeagueId!)}/categories/${encodeURIComponent(fetchEditCategoryId!)}`
        : `/api/leagues/${encodeURIComponent(leagueId)}/categories`;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (!isEdit) {
        if (!idempotencyKeyRef.current) {
          idempotencyKeyRef.current =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }
        headers["Idempotency-Key"] = idempotencyKeyRef.current;
      }

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers,
        body: JSON.stringify(parsed.data),
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
        setSubmitError(
          typeof data.error === "string"
            ? data.error
            : isEdit
              ? "No se pudo actualizar la categoría. Intentá de nuevo."
              : "No se pudo crear la categoría. Intentá de nuevo.",
        );
        return;
      }

      onCategoryCreated?.();
      if (!isEdit) {
        idempotencyKeyRef.current = null;
        resetForm();
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (isEdit && editLoadState === "loading") {
    return (
      <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3">
        <div
          className="border-brand-teal size-10 animate-spin rounded-full border-2 border-t-transparent"
          aria-label="Cargando"
          role="status"
        />
        <p className="text-foreground-muted text-sm">Cargando categoría…</p>
      </div>
    );
  }

  if (isEdit && editLoadState === "error") {
    return (
      <div className="w-full space-y-4">
        <p className="text-brand-purple text-sm">{editLoadError ?? "No se pudo cargar."}</p>
        <button
          type="button"
          className="border-border text-foreground-muted hover:text-foreground rounded-full border px-5 py-2 text-sm font-medium"
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
        Liga: <span className="text-foreground font-medium">{leagueName}</span>.
        {isEdit ? (
          <>
            {" "}
            El <code className="text-foreground-muted text-xs">code</code> (
            <span className="font-mono">{codeReadOnly || "…"}</span>) no se puede cambiar: otras
            tablas referencian la categoría por{" "}
            <code className="text-foreground-muted text-xs">id</code>.
          </>
        ) : (
          <>
            {" "}
            El <code className="text-foreground-muted text-xs">code</code> se genera en el servidor
            (único por liga). Reintentos con la misma clave no duplican la categoría.
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
          <span className="text-foreground-muted text-xs font-medium">Nombre de categoría</span>
          <input
            type="text"
            name="categoryName"
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
          <span className="text-foreground-muted text-xs font-medium">Género</span>
          <div className="relative mt-1">
            <select
              name="gender"
              value={gender}
              onChange={(e) =>
                setGender(e.target.value as (typeof leagueCategoryGenderOptions)[number]["value"])
              }
              className="border-border bg-surface-code/40 focus-visible:ring-brand-teal/50 hover:border-brand-teal/40 w-full cursor-pointer appearance-none rounded-brand-md border px-3 py-2 pr-10 text-sm outline-none transition-colors focus-visible:ring-2"
              aria-invalid={!!fieldErrors.gender}
            >
              {leagueCategoryGenderOptions.map((o) => (
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
          {fieldErrors.gender ? (
            <span className="text-brand-purple mt-1 block text-xs">{fieldErrors.gender}</span>
          ) : null}
        </label>

        <fieldset className="border-border rounded-brand-md border px-3 py-3">
          <legend className="text-foreground-muted px-1 text-xs font-medium">
            Reglas deportivas (opcional)
          </legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-1">
              <span className="text-foreground-muted text-xs font-medium">
                Año de nacimiento mínimo
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1900}
                max={new Date().getFullYear() + 1}
                name="birthYearMin"
                value={birthYearMinStr}
                onChange={(e) => setBirthYearMinStr(e.target.value)}
                placeholder="Ej. 2008 · vacío = sin límite"
                className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
                aria-invalid={!!fieldErrors.birthYearMin}
              />
              {fieldErrors.birthYearMin ? (
                <span className="text-brand-purple mt-1 block text-xs">
                  {fieldErrors.birthYearMin}
                </span>
              ) : (
                <span className="text-foreground-subtle mt-1 block text-[10px] leading-relaxed">
                  El más antiguo permitido (nadie nacido antes de este año).
                </span>
              )}
            </label>
            <label className="block sm:col-span-1">
              <span className="text-foreground-muted text-xs font-medium">
                Año de nacimiento máximo
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1900}
                max={new Date().getFullYear() + 1}
                name="birthYearMax"
                value={birthYearMaxStr}
                onChange={(e) => setBirthYearMaxStr(e.target.value)}
                placeholder="Ej. 2012 · vacío = sin límite"
                className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
                aria-invalid={!!fieldErrors.birthYearMax}
              />
              {fieldErrors.birthYearMax ? (
                <span className="text-brand-purple mt-1 block text-xs">
                  {fieldErrors.birthYearMax}
                </span>
              ) : (
                <span className="text-foreground-subtle mt-1 block text-[10px] leading-relaxed">
                  El más reciente permitido (nadie nacido después de este año).
                </span>
              )}
            </label>
            <label className="block sm:col-span-2">
              <span className="text-foreground-muted text-xs font-medium">
                Equipos mínimos para iniciar
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                name="minTeamsToStart"
                value={minTeamsStr}
                onChange={(e) => setMinTeamsStr(e.target.value)}
                placeholder="Vacío = sin mínimo registrado"
                className="border-border bg-surface-code/40 mt-1 w-full rounded-brand-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50"
                aria-invalid={!!fieldErrors.minTeamsToStart}
              />
              {fieldErrors.minTeamsToStart ? (
                <span className="text-brand-purple mt-1 block text-xs">
                  {fieldErrors.minTeamsToStart}
                </span>
              ) : (
                <span className="text-foreground-subtle mt-1 block text-[10px] leading-relaxed">
                  Se guarda en <code className="text-foreground-muted">metadata.minTeamsToStart</code>.
                </span>
              )}
            </label>
          </div>
        </fieldset>

        <div className="border-border mt-2 flex flex-wrap gap-3 border-t pt-5">
          <button
            type="button"
            className="border-border text-foreground-muted hover:text-foreground rounded-full border px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            onClick={() => {
              idempotencyKeyRef.current = null;
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
            disabled={submitting}
          >
            {submitting
              ? "Guardando…"
              : isEdit
                ? "Guardar cambios"
                : "Guardar categoría"}
          </button>
        </div>
      </form>
    </div>
  );
}
