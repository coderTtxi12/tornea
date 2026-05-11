import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";

export type AppUserRow = typeof users.$inferSelect;

export function userRowHasDashboardAccess(row: AppUserRow): boolean {
  return row.dashboardAccessGrantedAt != null;
}

export async function hasDashboardAccessForAuthUserId(
  authUserId: string,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ dashboardAccessGrantedAt: users.dashboardAccessGrantedAt })
    .from(users)
    .where(eq(users.authUserId, authUserId))
    .limit(1);
  return row?.dashboardAccessGrantedAt != null;
}

export async function syncAppUserFromSupabaseAuthUser(
  authUser: SupabaseAuthUser,
): Promise<AppUserRow> {
  const db = getDb();
  const email = authUser.email?.trim();
  if (!email) {
    throw new Error("Supabase user has no email");
  }

  const authUserId = authUser.id;
  const displayName =
    (typeof authUser.user_metadata?.full_name === "string"
      ? authUser.user_metadata.full_name
      : null) ??
    (typeof authUser.user_metadata?.name === "string"
      ? authUser.user_metadata.name
      : null);

  const avatarUrl =
    typeof authUser.user_metadata?.avatar_url === "string"
      ? authUser.user_metadata.avatar_url
      : null;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.authUserId, authUserId))
    .limit(1);

  const now = new Date();

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        email,
        displayName: displayName ?? existing.displayName,
        avatarUrl: avatarUrl ?? existing.avatarUrl,
        updatedAt: now,
      })
      .where(eq(users.id, existing.id))
      .returning();
    if (!updated) {
      throw new Error("Failed to update app user");
    }
    return updated;
  }

  const [inserted] = await db
    .insert(users)
    .values({
      authUserId,
      email,
      displayName,
      avatarUrl,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!inserted) {
    throw new Error("Failed to insert app user");
  }
  return inserted;
}

/**
 * After OAuth exchange: send operators to `requestedNext`, gate everyone else to the lead form.
 */
export function resolvePostLoginRelativePath(params: {
  hasAccess: boolean;
  requestedNext: string;
}): string {
  if (params.hasAccess) {
    if (params.requestedNext === "/solicitar-acceso") {
      return "/dashboard";
    }
    return params.requestedNext;
  }
  return "/solicitar-acceso";
}
