"use client";

import type { DashboardNavKey } from "../nav";

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

export function DashboardViewSwitch({ nav }: { nav: DashboardNavKey }) {
  switch (nav) {
    case "home":
      return <DashboardHomeView />;
    case "leagues":
      return <DashboardLeaguesView />;
    case "fixture":
      return <DashboardFixtureView />;
    case "live":
      return <DashboardLiveView />;
    case "teams":
      return <DashboardTeamsView />;
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
