import { eq } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getDb } from "@/db/client";
import { teams } from "@/db/schema";

import { leagueShieldStorageBucket, shieldExtensionForContentType } from "./upload-league-shield";

/**
 * Sube el escudo del club a Storage y guarda la URL pública en `teams.crest_url`.
 */
export async function uploadTeamCrestAndSetUrl(
  supabase: SupabaseClient,
  opts: {
    bucket: string;
    ownerUserId: string;
    leagueId: string;
    teamId: string;
    bytes: Uint8Array;
    contentType: string;
  },
): Promise<string> {
  const ext = shieldExtensionForContentType(opts.contentType);
  if (!ext) {
    throw new Error("Tipo de imagen no permitido para el escudo");
  }

  const path = `${opts.ownerUserId}/${opts.leagueId}/teams/${opts.teamId}/crest.${ext}`;
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
  const publicUrl = data.publicUrl;

  const db = getDb();
  await db
    .update(teams)
    .set({ crestUrl: publicUrl, updatedAt: new Date() })
    .where(eq(teams.id, opts.teamId));

  return publicUrl;
}

export { leagueShieldStorageBucket };
