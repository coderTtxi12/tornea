import { NextResponse } from "next/server";

import {
  accessRequestFormSchema,
  insertDashboardAccessRequest,
} from "@/logic/access-request/access-request-form";
import {
  syncAppUserFromSupabaseAuthUser,
  userRowHasDashboardAccess,
} from "@/logic/auth/dashboard-access";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = accessRequestFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const appUser = await syncAppUserFromSupabaseAuthUser(user);
  if (userRowHasDashboardAccess(appUser)) {
    return NextResponse.json(
      { error: "Ya tienes acceso al panel." },
      { status: 409 },
    );
  }

  try {
    const row = await insertDashboardAccessRequest({
      userId: appUser.id,
      data: parsed.data,
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
