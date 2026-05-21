import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/api";
import { hasDashboardAccessForAuthUserId } from "@/logic/auth/dashboard-access";

export async function GET() {
  const auth = await requireAppUser();
  if (!auth.ok) {
    return NextResponse.json({ allowed: false }, { status: 401 });
  }

  const allowed = await hasDashboardAccessForAuthUserId(auth.ctx.authUser.id);
  return NextResponse.json({ allowed });
}
