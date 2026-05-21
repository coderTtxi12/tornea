import { and, eq } from "drizzle-orm";

import {
  parseVenueMetadataForEditForm,
  type VenueSurfacePreset,
} from "@/schemas/dashboard/new-venue-form-schema";
import { getDb } from "@/db/client";
import { leagues, venues } from "@/db/schema";

import { userCanManageLeague } from "./league-dashboard-admin";

import type { VenuePhotoRef } from "./upload-venue-photos";

function isVenuePhotoRef(x: unknown): x is VenuePhotoRef {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.bucket === "string" &&
    typeof o.path === "string" &&
    typeof o.publicUrl === "string" &&
    typeof o.contentType === "string"
  );
}

function extractPhotoRefs(metadata: unknown): VenuePhotoRef[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  const p = (metadata as Record<string, unknown>).photos;
  if (!Array.isArray(p)) return [];
  return p.filter(isVenuePhotoRef);
}

export type VenueForOwnerEditPayload = {
  venue: {
    id: string;
    leagueId: string;
    name: string;
    address: string | null;
    surfacePreset: VenueSurfacePreset;
    surfaceCustom: string;
    availabilityNotes: string;
    existingPhotoRefs: VenuePhotoRef[];
  };
};

/**
 * Carga cancha para edición. Dueño o administrador del panel.
 */
export async function getVenueForOwnerEdit(
  ownerUserId: string,
  leagueId: string,
  venueId: string,
): Promise<VenueForOwnerEditPayload | "FORBIDDEN" | "NOT_FOUND"> {
  const db = getDb();

  const [row] = await db
    .select({
      id: venues.id,
      leagueId: venues.leagueId,
      name: venues.name,
      address: venues.address,
      metadata: venues.metadata,
    })
    .from(venues)
    .innerJoin(leagues, eq(venues.leagueId, leagues.id))
    .where(and(eq(venues.id, venueId), eq(venues.leagueId, leagueId)))
    .limit(1);

  if (!row) {
    return "NOT_FOUND";
  }
  if (!(await userCanManageLeague(db, leagueId, ownerUserId))) {
    return "FORBIDDEN";
  }

  const parsed = parseVenueMetadataForEditForm(row.metadata);
  const existingPhotoRefs = extractPhotoRefs(row.metadata);

  return {
    venue: {
      id: row.id,
      leagueId: row.leagueId,
      name: row.name,
      address: row.address,
      surfacePreset: parsed.surfacePreset,
      surfaceCustom: parsed.surfaceCustom,
      availabilityNotes: parsed.availabilityNotes,
      existingPhotoRefs,
    },
  };
}
