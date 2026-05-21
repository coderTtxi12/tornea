import { NextResponse } from "next/server";

import { requireAppUser, validationErrorFromZod } from "@/lib/api";
import { z } from "zod";

import { AppAuditEntityType, recordAppAuditLog } from "@/logic/audit";
import { getDb } from "@/db/client";
import { addLeagueDashboardAdminByEmail } from "@/logic/leagues/add-league-dashboard-admin-by-email";
import {
  userCanManageLeague,
  userIsLeagueSuperuser,
} from "@/logic/leagues/league-dashboard-admin";
import { listLeagueDashboardAdmins } from "@/logic/leagues/list-league-dashboard-admins";

const postBodySchema = z.object({
  email: z.string().trim().min(3).email("Correo no válido."),
});

/**
 * GET — administradores del panel para la liga (dueño + admins en `league_members`).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ leagueId: string }> },
) {
  try {
    const { leagueId } = await context.params;
    if (!leagueId) {
      return NextResponse.json({ error: "Liga no válida." }, { status: 400 });
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;
    const db = getDb();
    if (!(await userCanManageLeague(db, leagueId, appUser.id))) {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }

    try {
      const { superuserUserId, admins } = await listLeagueDashboardAdmins(leagueId);
      const viewerIsSuperuser = await userIsLeagueSuperuser(db, leagueId, appUser.id);
      return NextResponse.json({ superuserUserId, viewerIsSuperuser, admins });
    } catch (e) {
      if (e instanceof Error && e.message === "LEAGUE_NOT_FOUND") {
        return NextResponse.json({ error: "Liga no encontrada." }, { status: 404 });
      }
      throw e;
    }
  } catch (e) {
    console.error("[GET /api/leagues/[leagueId]/admins]", e);
    return NextResponse.json({ error: "No se pudieron cargar los administradores." }, { status: 500 });
  }
}

/**
 * POST — agregar administrador por correo (`league_members.role = admin`).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ leagueId: string }> },
) {
  try {
    const { leagueId } = await context.params;
    if (!leagueId) {
      return NextResponse.json({ error: "Liga no válida." }, { status: 400 });
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }

    const parsed = postBodySchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorFromZod(parsed.error);
    }

    const email = parsed.data.email.trim().toLowerCase();
    const result = await addLeagueDashboardAdminByEmail({
      leagueId,
      actorUserId: appUser.id,
      email,
    });

    if (result === "FORBIDDEN") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }
    if (result === "LEAGUE_NOT_FOUND") {
      return NextResponse.json({ error: "Liga no encontrada." }, { status: 404 });
    }
    if (result === "USER_NOT_FOUND") {
      return NextResponse.json(
        {
          error:
            "No hay ninguna cuenta con ese correo. La persona debe registrarse en Tornea primero.",
        },
        { status: 404 },
      );
    }
    if (result === "ALREADY_ADMIN") {
      return NextResponse.json(
        { error: "Ese correo ya es administrador de esta liga." },
        { status: 409 },
      );
    }
    if (result === "MEMBER_OTHER_ROLE") {
      return NextResponse.json(
        {
          error:
            "Ese usuario ya es miembro de la liga con otro rol. Quitá ese rol antes o usá otro correo.",
        },
        { status: 409 },
      );
    }
    if (result === "IS_SUPERUSER") {
      return NextResponse.json(
        { error: "El propietario de la liga ya tiene acceso completo." },
        { status: 400 },
      );
    }

    await recordAppAuditLog({
      actorUserId: appUser.id,
      action: "create",
      entityType: AppAuditEntityType.leagueMember,
      entityId: result.userId,
      summary: result.grantedDashboardAccess
        ? `Agregó administrador del panel y habilitó acceso (${email})`
        : `Agregó administrador del panel (${email})`,
      leagueId,
      metadata: {
        invitedEmail: email,
        grantedDashboardAccess: result.grantedDashboardAccess,
      },
    });
    return NextResponse.json(
      {
        ok: true,
        userId: result.userId,
        grantedDashboardAccess: result.grantedDashboardAccess,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/leagues/[leagueId]/admins]", e);
    return NextResponse.json({ error: "No se pudo agregar el administrador." }, { status: 500 });
  }
}
