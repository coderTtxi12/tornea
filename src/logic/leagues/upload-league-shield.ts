import { eq } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getDb } from "@/db/client";
import { leagues } from "@/db/schema";

export function leagueShieldStorageBucket(): string {
  const fromEnv = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : "tornea";
}

export function shieldExtensionForContentType(
  contentType: string,
): "jpg" | "png" | "webp" | null {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return null;
}

export type LeagueShieldBrandingPatch = {
  bucket: string;
  path: string;
  publicUrl: string;
  contentType: string;
};

/**
 * Sube el escudo y fusiona metadatos en `leagues.branding` (JSON).
 * Requiere políticas de Storage (p. ej. INSERT al bucket para rutas `{app_user_id}/*`) o
 * cliente con `SUPABASE_SERVICE_ROLE_KEY` en el servidor.
 */
export async function uploadLeagueShieldAndMergeBranding(
  supabase: SupabaseClient,
  opts: {
    bucket: string;
    ownerUserId: string;
    leagueId: string;
    bytes: Uint8Array;
    contentType: string;
  },
): Promise<LeagueShieldBrandingPatch> {
  const ext = shieldExtensionForContentType(opts.contentType);
  if (!ext) {
    throw new Error("Tipo de imagen no permitido para el escudo");
  }

  const path = `${opts.ownerUserId}/${opts.leagueId}/shield.${ext}`;
  const bucketRef = supabase.storage.from(opts.bucket);
  const { error: uploadError } = await bucketRef.upload(path, opts.bytes, {
    cacheControl: "3600",
    contentType: opts.contentType,
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = bucketRef.getPublicUrl(path);
  const patch: LeagueShieldBrandingPatch = {
    bucket: opts.bucket,
    path,
    publicUrl: data.publicUrl,
    contentType: opts.contentType,
  };

  const db = getDb();
  try {
    const [row] = await db
      .select({ branding: leagues.branding })
      .from(leagues)
      .where(eq(leagues.id, opts.leagueId))
      .limit(1);

    if (!row) {
      throw new Error("Liga no encontrada al guardar escudo");
    }

    const prev =
      row.branding && typeof row.branding === "object" && !Array.isArray(row.branding)
        ? (row.branding as Record<string, unknown>)
        : {};

    const branding = { ...prev, shield: patch };
    await db
      .update(leagues)
      .set({ branding, updatedAt: new Date() })
      .where(eq(leagues.id, opts.leagueId));
  } catch (e) {
    try {
      await bucketRef.remove([path]);
    } catch {
      /* Storage cleanup puede fallar por RLS; el error original es el relevante. */
    }
    throw e;
  }

  return patch;
}
