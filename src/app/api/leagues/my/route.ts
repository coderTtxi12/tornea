import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/api";
import { listOwnedLeaguesOrganizationCards } from "@/logic/leagues/list-owned-league-org-cards";
import { listOwnedPlayerDashboardRowsPage } from "@/logic/leagues/list-owned-player-dashboard-rows";
import { listOwnedTeamDashboardRowsPage } from "@/logic/leagues/list-owned-team-dashboard-rows";
import { listOwnedRefereeDashboardRows } from "@/logic/leagues/list-owned-referee-dashboard-rows";
import { listOwnedVenueDashboardRows } from "@/logic/leagues/list-owned-venue-dashboard-rows";

/**
 * GET — ligas de las que el usuario autenticado es propietario.
 */
export async function GET() {
  try {
    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
    const { appUser } = auth.ctx;
    const [leagues, teamsPage, playersPage, venues, referees] = await Promise.all([
      listOwnedLeaguesOrganizationCards(appUser.id),
      listOwnedTeamDashboardRowsPage(appUser.id),
      listOwnedPlayerDashboardRowsPage(appUser.id),
      listOwnedVenueDashboardRows(appUser.id),
      listOwnedRefereeDashboardRows(appUser.id),
    ]);

    return NextResponse.json({
      leagues,
      teams: teamsPage.rows,
      teamsNextCursor: teamsPage.nextCursor,
      players: playersPage.rows,
      playersNextCursor: playersPage.nextCursor,
      venues,
      referees,
    });
  } catch (e) {
    console.error("[GET /api/leagues/my]", e);
    return NextResponse.json(
      { error: "No se pudieron cargar las ligas" },
      { status: 500 },
    );
  }
}
