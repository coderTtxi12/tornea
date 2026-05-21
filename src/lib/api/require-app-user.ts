import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import {
  syncAppUserFromSupabaseAuthUser,
  type AppUserRow,
} from "@/logic/auth/dashboard-access";
import { createClient } from "@/lib/supabase/server";

export type AppUserContext = {
  authUser: User;
  appUser: AppUserRow;
};

export type RequireAppUserResult =
  | { ok: true; ctx: AppUserContext }
  | { ok: false; response: NextResponse };

/**
 * Resolves Supabase session → app `users` row for API routes.
 * Returns a ready-made 401 response when unauthenticated.
 */
export async function requireAppUser(): Promise<RequireAppUserResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const appUser = await syncAppUserFromSupabaseAuthUser(user);
  return { ok: true, ctx: { authUser: user, appUser } };
}
