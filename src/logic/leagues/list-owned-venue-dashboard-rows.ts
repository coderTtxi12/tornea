import { asc, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagues, venues } from "@/db/schema";

import { listManagedLeagueIdsForDashboardUser } from "./league-dashboard-admin";

function readSurfaceType(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const raw = (metadata as Record<string, unknown>).surfaceType;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function venueCardBadge(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  const initials = words.map((w) => (w[0]?.toUpperCase() ?? "")).join("");
  const base = initials || name.trim().slice(0, 3).toUpperCase() || "CAN";
  return base.slice(0, 8);
}

export type OwnedVenueDashboardRow = {
  id: string;
  leagueId: string;
  leagueName: string;
  name: string;
  address: string | null;
  surface: string | null;
  badgeLabel: string;
  photoCount: number;
  hasAvailabilityNotes: boolean;
};

/**
 * Canchas (`venues`) de ligas que el usuario gestiona (dueño o admin).
 */
export async function listOwnedVenueDashboardRows(
  ownerUserId: string,
): Promise<OwnedVenueDashboardRow[]> {
  const db = getDb();

  const leagueIdsManaged = await listManagedLeagueIdsForDashboardUser(ownerUserId);
  if (leagueIdsManaged.length === 0) {
    return [];
  }

  const owned = await db
    .select({ id: leagues.id, name: leagues.name })
    .from(leagues)
    .where(inArray(leagues.id, leagueIdsManaged));

  if (owned.length === 0) {
    return [];
  }

  const leagueIds = owned.map((l) => l.id);
  const leagueNameById = new Map(owned.map((l) => [l.id, l.name]));

  const rows = await db
    .select({
      id: venues.id,
      leagueId: venues.leagueId,
      name: venues.name,
      address: venues.address,
      metadata: venues.metadata,
    })
    .from(venues)
    .where(inArray(venues.leagueId, leagueIds))
    .orderBy(asc(venues.leagueId), asc(venues.sortOrder), asc(venues.name));

  return rows.map((r) => {
    const meta = r.metadata;
    let photoCount = 0;
    if (meta && typeof meta === "object" && !Array.isArray(meta)) {
      const photos = (meta as Record<string, unknown>).photos;
      if (Array.isArray(photos)) {
        photoCount = photos.length;
      }
    }
    let hasAvailabilityNotes = false;
    if (meta && typeof meta === "object" && !Array.isArray(meta)) {
      const n = (meta as Record<string, unknown>).availabilityNotes;
      hasAvailabilityNotes = typeof n === "string" && n.trim().length > 0;
    }

    return {
      id: r.id,
      leagueId: r.leagueId,
      leagueName: leagueNameById.get(r.leagueId) ?? "",
      name: r.name,
      address: r.address,
      surface: readSurfaceType(meta),
      badgeLabel: venueCardBadge(r.name),
      photoCount,
      hasAvailabilityNotes,
    };
  });
}
