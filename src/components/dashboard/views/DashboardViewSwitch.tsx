"use client";

import type { DashboardNavKey } from "../nav";

import type { MyLeaguesApiItem, MyLeaguesTeamRow } from "../leagues/my-leagues-state";

import { DashboardDisciplineView } from "./DashboardDisciplineView";
import { DashboardFixtureView } from "./DashboardFixtureView";
import { DashboardHomeView } from "./DashboardHomeView";
import { DashboardLeaguesView } from "./DashboardLeaguesView";
import { DashboardLiveView } from "./DashboardLiveView";
import { DashboardPlayersView } from "./DashboardPlayersView";
import { DashboardReportsView } from "./DashboardReportsView";
import { DashboardSettingsView } from "./DashboardSettingsView";
import { DashboardStandingsView } from "./DashboardStandingsView";
import { DashboardTeamsView } from "./DashboardTeamsView";
import { DashboardVenuesView } from "./DashboardVenuesView";

export function DashboardViewSwitch({
  nav,
  leagueOrgCards,
  teamRows,
  onOpenNewLeagueDrawer,
  onOpenNewCategoryDrawer,
  onOpenRegisterTeamDrawer,
  onOpenEditTeamDrawer,
}: {
  nav: DashboardNavKey;
  leagueOrgCards: readonly MyLeaguesApiItem[];
  teamRows: readonly MyLeaguesTeamRow[];
  onOpenNewLeagueDrawer: () => void;
  onOpenNewCategoryDrawer: (args: { leagueId: string; leagueName: string }) => void;
  onOpenRegisterTeamDrawer: () => void;
  onOpenEditTeamDrawer: (args: { leagueId: string; teamId: string }) => void;
}) {
  switch (nav) {
    case "home":
      return <DashboardHomeView />;
    case "leagues":
      return (
        <DashboardLeaguesView
          leagues={leagueOrgCards}
          onOpenNewLeagueDrawer={onOpenNewLeagueDrawer}
          onOpenNewCategoryDrawer={onOpenNewCategoryDrawer}
        />
      );
    case "fixture":
      return <DashboardFixtureView />;
    case "live":
      return <DashboardLiveView />;
    case "teams":
      return (
        <DashboardTeamsView
          teamRows={teamRows}
          onOpenRegisterTeamDrawer={onOpenRegisterTeamDrawer}
          onOpenEditTeamDrawer={onOpenEditTeamDrawer}
        />
      );
    case "players":
      return <DashboardPlayersView />;
    case "venues":
      return <DashboardVenuesView />;
    case "standings":
      return <DashboardStandingsView />;
    case "discipline":
      return <DashboardDisciplineView />;
    case "reports":
      return <DashboardReportsView />;
    case "settings":
      return <DashboardSettingsView />;
    default:
      return <DashboardHomeView />;
  }
}
