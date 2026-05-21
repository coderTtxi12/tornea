import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/api";
import {
  accessRequestFormSchema,
  insertDashboardAccessRequest,
} from "@/logic/access-request/access-request-form";
import { userRowHasDashboardAccess } from "@/logic/auth/dashboard-access";

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { appUser } = auth.ctx;

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
    console.error("[POST /api/access-request]", e);
    return NextResponse.json(
      { error: "No se pudo registrar la solicitud." },
      { status: 500 },
    );
  }
}
