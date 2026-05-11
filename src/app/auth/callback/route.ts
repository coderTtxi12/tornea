import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  resolvePostLoginRelativePath,
  syncAppUserFromSupabaseAuthUser,
  userRowHasDashboardAccess,
} from "@/logic/auth/dashboard-access";

function safeRelativeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRelativeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.redirect(`${origin}/?error=auth`);
      }

      try {
        const appUser = await syncAppUserFromSupabaseAuthUser(user);
        const hasAccess = userRowHasDashboardAccess(appUser);
        const path = resolvePostLoginRelativePath({ hasAccess, requestedNext: next });
        return NextResponse.redirect(`${origin}${path}`);
      } catch {
        return NextResponse.redirect(`${origin}/?error=sync`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
