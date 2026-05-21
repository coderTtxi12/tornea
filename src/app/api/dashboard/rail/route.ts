import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/api";
import { listRecentAppAuditLogsForLeagues } from "@/logic/audit";
import { listRailPendingMatches } from "@/logic/dashboard/list-rail-pending-matches";
import { listManagedLeagueIdsForDashboardUser } from "@/logic/leagues/league-dashboard-admin";

/** Límite de filas para actividad reciente y pendientes en el rail (mismo tamaño de batch). */
export const DASHBOARD_RAIL_BATCH_LIMIT = 20;

function actorLabelFromAuditRow(row: {
  actorDisplayNameSnapshot: string | null;
  actorEmailSnapshot: string | null;
}): string {
  const name = row.actorDisplayNameSnapshot?.trim();
  if (name) return name;
  const email = row.actorEmailSnapshot?.trim();
  if (email) return email;
  return "Usuario";
}

function formatRelativeTimeEs(iso: string): string {
  const thenMs = new Date(iso).getTime();
  if (Number.isNaN(thenMs)) {
    return "";
  }
  const diffSec = Math.floor((Date.now() - thenMs) / 1000);
  if (diffSec < 45) {
    return "Hace un momento";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return diffMin <= 1 ? "Hace 1 min" : `Hace ${diffMin} min`;
  }
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) {
    return diffH === 1 ? "Hace 1 h" : `Hace ${diffH} h`;
  }
  const dThen = new Date(iso);
  const dNow = new Date();
  const startThen = new Date(
    dThen.getFullYear(),
    dThen.getMonth(),
    dThen.getDate(),
  ).getTime();
  const startNow = new Date(
    dNow.getFullYear(),
    dNow.getMonth(),
    dNow.getDate(),
  ).getTime();
  const dayDiff = Math.round((startNow - startThen) / 86400000);
  if (dayDiff === 1) {
    return "Ayer";
  }
  if (dayDiff === 0) {
    return "Hoy";
  }
  if (dayDiff > 1 && dayDiff < 7) {
    return `Hace ${dayDiff} días`;
  }
  return dThen.toLocaleDateString("es", { day: "numeric", month: "short" });
}

/**
 * GET — datos del panel derecho (actividad reciente + pendientes operativos).
 */
export async function GET() {
  try {
    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;
    const leagueIds = await listManagedLeagueIdsForDashboardUser(appUser.id);

    if (leagueIds.length === 0) {
      return NextResponse.json({
        managedLeagueCount: 0,
        recentActivity: [],
        pendingItems: [],
      });
    }

    const [auditRows, pendingRows] = await Promise.all([
      listRecentAppAuditLogsForLeagues(leagueIds, {
        limit: DASHBOARD_RAIL_BATCH_LIMIT,
      }),
      listRailPendingMatches(leagueIds, { limit: DASHBOARD_RAIL_BATCH_LIMIT }),
    ]);

    return NextResponse.json({
      managedLeagueCount: leagueIds.length,
      recentActivity: auditRows.map((r) => ({
        id: r.id,
        summary: r.summary,
        actorLabel: actorLabelFromAuditRow(r),
        leagueName: r.leagueName,
        createdAt: r.createdAt,
        relativeTime: formatRelativeTimeEs(r.createdAt),
      })),
      pendingItems: pendingRows.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        urgent: p.tone === "urgent",
      })),
    });
  } catch (e) {
    console.error("[GET /api/dashboard/rail]", e);
    return NextResponse.json(
      { error: "No se pudo cargar la agenda." },
      { status: 500 },
    );
  }
}
