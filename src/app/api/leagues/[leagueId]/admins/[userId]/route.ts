import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/api";

import { AppAuditEntityType, recordAppAuditLog } from "@/logic/audit";
import { removeLeagueDashboardAdmin } from "@/logic/leagues/remove-league-dashboard-admin";

/**
 * DELETE — quita un administrador invitado (`admin`). Solo el superusuario de la liga.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ leagueId: string; userId: string }> },
) {
  try {
    const { leagueId, userId: targetUserId } = await context.params;
    if (!leagueId || !targetUserId) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;
    const result = await removeLeagueDashboardAdmin({
      leagueId,
      actorUserId: appUser.id,
      targetUserId,
    });

    switch (result) {
      case "FORBIDDEN":
        return NextResponse.json(
          {
            error:
              "Solo el propietario de la liga (quien creó la cuenta) puede quitar administradores.",
          },
          { status: 403 },
        );
      case "CANNOT_REMOVE_SUPERUSER":
        return NextResponse.json(
          { error: "No se puede quitar al propietario de la liga." },
          { status: 400 },
        );
      case "NOT_FOUND":
        return NextResponse.json(
          { error: "No hay un administrador invitado con ese usuario." },
          { status: 404 },
        );
      case "OK":
        await recordAppAuditLog({
          actorUserId: appUser.id,
          action: "delete",
          entityType: AppAuditEntityType.leagueMember,
          entityId: targetUserId,
          summary: "Quitó administrador del panel",
          leagueId,
        });
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: "Error inesperado." }, { status: 500 });
    }
  } catch (e) {
    console.error("[DELETE /api/leagues/[leagueId]/admins/[userId]]", e);
    return NextResponse.json({ error: "No se pudo quitar el administrador." }, { status: 500 });
  }
}
