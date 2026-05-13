import { NextResponse } from "next/server";

import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import {
  listOwnedMatchDashboardPage,
  type OwnedMatchDashboardListFilters,
  type OwnedMatchDashboardListSort,
} from "@/logic/leagues/list-owned-match-dashboard-rows";
import { createClient } from "@/lib/supabase/server";

function parseListFilters(sp: URLSearchParams): OwnedMatchDashboardListFilters {
  return {
    leagueNames: sp.getAll("league"),
    seasonNames: sp.getAll("season"),
    statuses: sp.getAll("status"),
    categoryNames: sp.getAll("category"),
  };
}

function parseSort(sp: URLSearchParams): OwnedMatchDashboardListSort {
  const key = sp.get("sort") === "matchup" ? "matchup" : "kickoff";
  const dir = sp.get("dir") === "asc" ? "asc" : "desc";
  return { key, dir };
}

/**
 * GET — partidos paginados (`matches`) con filtros y orden en base.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const appUser = await syncAppUserFromSupabaseAuthUser(user);
    const url = new URL(request.url);
    const sp = url.searchParams;

    const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
    const pageSizeRaw = Number.parseInt(sp.get("pageSize") ?? "20", 10) || 20;
    const pageSize = Math.min(100, Math.max(1, pageSizeRaw));

    const sort = parseSort(sp);
    const filters = parseListFilters(sp);

    const { rows, total } = await listOwnedMatchDashboardPage(appUser.id, {
      page,
      pageSize,
      sort,
      filters,
    });

    return NextResponse.json({
      matches: rows,
      total,
      page,
      pageSize,
      sort,
    });
  } catch (e) {
    console.error("[GET /api/leagues/my/matches]", e);
    return NextResponse.json({ error: "No se pudieron cargar los partidos" }, { status: 500 });
  }
}
