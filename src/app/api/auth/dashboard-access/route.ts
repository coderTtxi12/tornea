import { NextResponse } from "next/server";

import {
  hasDashboardAccessForAuthUserId,
  syncAppUserFromSupabaseAuthUser,
} from "@/logic/auth/dashboard-access";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ allowed: false }, { status: 401 });
  }

  await syncAppUserFromSupabaseAuthUser(user);
  const allowed = await hasDashboardAccessForAuthUserId(user.id);
  return NextResponse.json({ allowed });
}
