import { asc, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagueReferees, leagues } from "@/db/schema";
import {
  resolvePlayerCurpForDownload,
  resolvePlayerPhotoForImgDisplay,
} from "@/logic/leagues/resolve-supabase-storage-url-for-img-display";

import { listManagedLeagueIdsForDashboardUser } from "./league-dashboard-admin";

function pgErrorCode(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let depth = 0; depth < 8 && cur != null; depth++) {
    if (
      typeof cur === "object" &&
      cur !== null &&
      "code" in cur &&
      typeof (cur as { code: unknown }).code === "string"
    ) {
      return (cur as { code: string }).code;
    }
    if (typeof cur === "object" && cur !== null && "cause" in cur) {
      cur = (cur as { cause: unknown }).cause;
    } else {
      break;
    }
  }
  return undefined;
}

export type OwnedRefereeDashboardRow = {
  id: string;
  leagueId: string;
  leagueName: string;
  fullName: string;
  whatsapp: string;
  email: string | null;
  /** Archivo CURP en `metadata.curp` (signed URL). */
  curpDownloadUrl: string | null;
  /** Texto en columna `curp` (datos viejos antes de subir archivo). */
  curpLegacyText: string | null;
  notes: string | null;
  profileImageUrl: string | null;
};

/**
 * Árbitros de contacto (`league_referees`) en ligas gestionadas por el usuario.
 */
export async function listOwnedRefereeDashboardRows(
  ownerUserId: string,
): Promise<OwnedRefereeDashboardRow[]> {
  const leagueIdsManaged = await listManagedLeagueIdsForDashboardUser(ownerUserId);
  if (leagueIdsManaged.length === 0) {
    return [];
  }

  const db = getDb();
  const owned = await db
    .select({ id: leagues.id, name: leagues.name })
    .from(leagues)
    .where(inArray(leagues.id, leagueIdsManaged));

  if (owned.length === 0) {
    return [];
  }

  const leagueNameById = new Map(owned.map((l) => [l.id, l.name]));
  const leagueIds = owned.map((l) => l.id);

  let rows: {
    id: string;
    leagueId: string;
    fullName: string;
    whatsapp: string;
    email: string | null;
    curp: string | null;
    notes: string | null;
    metadata: unknown;
  }[];
  try {
    rows = await db
      .select({
        id: leagueReferees.id,
        leagueId: leagueReferees.leagueId,
        fullName: leagueReferees.fullName,
        whatsapp: leagueReferees.whatsapp,
        email: leagueReferees.email,
        curp: leagueReferees.curp,
        notes: leagueReferees.notes,
        metadata: leagueReferees.metadata,
      })
      .from(leagueReferees)
      .where(inArray(leagueReferees.leagueId, leagueIds))
      .orderBy(
        asc(leagueReferees.leagueId),
        asc(leagueReferees.sortOrder),
        asc(leagueReferees.fullName),
      );
  } catch (e) {
    /** Migración `0013_league_referees` pendiente u otra base sin la tabla. */
    if (pgErrorCode(e) === "42P01") {
      console.warn(
        "[listOwnedRefereeDashboardRows] Tabla league_referees inexistente; devolvé [] hasta `npm run db:migrate`.",
      );
      return [];
    }
    throw e;
  }

  const out: OwnedRefereeDashboardRow[] = [];
  for (const r of rows) {
    const [profileImageUrl, curpDownloadUrl] = await Promise.all([
      resolvePlayerPhotoForImgDisplay(r.metadata),
      resolvePlayerCurpForDownload(r.metadata),
    ]);
    const legacy = r.curp?.trim() ? r.curp.trim() : null;
    out.push({
      id: r.id,
      leagueId: r.leagueId,
      leagueName: leagueNameById.get(r.leagueId) ?? "",
      fullName: r.fullName,
      whatsapp: r.whatsapp,
      email: r.email ?? null,
      curpDownloadUrl,
      curpLegacyText: legacy,
      notes: r.notes?.trim() ? r.notes.trim() : null,
      profileImageUrl,
    });
  }
  return out;
}
