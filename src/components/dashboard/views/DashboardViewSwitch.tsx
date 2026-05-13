"use client";

import type { DashboardNavKey } from "../nav";

import type {
  MyLeaguesApiItem,
  MyLeaguesMatchRow,
  MyLeaguesPlayerRow,
  MyLeaguesRefereeRow,
  MyLeaguesTeamRow,
  MyLeaguesVenueRow,
} from "../leagues/my-leagues-state";

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
  playerRows,
  playersNextCursor,
  onLoadMorePlayers,
  playersLoadingMore,
  onOpenNewLeagueDrawer,
  onOpenNewCategoryDrawer,
  onOpenNewVenueDrawer,
  onOpenEditVenueDrawer,
  venueRows,
  refereeRows,
  onOpenNewRefereeDrawer,
  onOpenRegisterTeamDrawer,
  onOpenEditTeamDrawer,
  onOpenRegisterPlayerDrawer,
  onOpenPlayerSheetDrawer,
  onOpenNewMatchDrawer,
  onOpenEditMatchDrawer,
  fixtureDataRefreshKey = 0,
}: {
  nav: DashboardNavKey;
  leagueOrgCards: readonly MyLeaguesApiItem[];
  teamRows: readonly MyLeaguesTeamRow[];
  playerRows: readonly MyLeaguesPlayerRow[];
  playersNextCursor: string | null;
  onLoadMorePlayers?: () => Promise<{
    ok: boolean;
    playerCount: number;
    hasMore: boolean;
  } | null>;
  playersLoadingMore?: boolean;
  onOpenNewLeagueDrawer: () => void;
  onOpenNewCategoryDrawer: (args: { leagueId: string; leagueName: string }) => void;
  onOpenNewVenueDrawer: () => void;
  onOpenEditVenueDrawer: (args: { leagueId: string; venueId: string }) => void;
  venueRows: readonly MyLeaguesVenueRow[];
  refereeRows: readonly MyLeaguesRefereeRow[];
  onOpenNewRefereeDrawer: () => void;
  onOpenRegisterTeamDrawer: () => void;
  onOpenEditTeamDrawer: (args: { leagueId: string; teamId: string }) => void;
  onOpenRegisterPlayerDrawer: (args?: { prefillTeamId?: string }) => void;
  onOpenPlayerSheetDrawer: (args: {
    leagueId: string;
    teamId: string;
    playerId: string;
  }) => void;
  onOpenNewMatchDrawer: () => void;
  onOpenEditMatchDrawer: (row: MyLeaguesMatchRow) => void;
  fixtureDataRefreshKey?: number;
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
      return (
        <DashboardFixtureView
          hasManagedLeagues={leagueOrgCards.length > 0}
          fixtureDataRefreshKey={fixtureDataRefreshKey}
          onOpenNewMatchDrawer={onOpenNewMatchDrawer}
          onOpenEditMatchDrawer={onOpenEditMatchDrawer}
        />
      );
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
      return (
        <DashboardPlayersView
          playerRows={playerRows}
          playersNextCursor={playersNextCursor}
          onLoadMorePlayers={onLoadMorePlayers}
          playersLoadingMore={playersLoadingMore}
          hasTeams={teamRows.length > 0}
          onOpenRegisterPlayerDrawer={onOpenRegisterPlayerDrawer}
          onOpenPlayerSheetDrawer={onOpenPlayerSheetDrawer}
        />
      );
    case "venues":
      return (
        <DashboardVenuesView
          venueRows={venueRows}
          refereeRows={refereeRows}
          leagueOrgCards={leagueOrgCards}
          onOpenNewVenueDrawer={onOpenNewVenueDrawer}
          onOpenEditVenueDrawer={onOpenEditVenueDrawer}
          onOpenNewRefereeDrawer={onOpenNewRefereeDrawer}
        />
      );
    case "standings":
      return <DashboardStandingsView />;
    case "discipline":
      return <DashboardDisciplineView />;
    case "reports":
      return <DashboardReportsView />;
    case "settings":
      return <DashboardSettingsView leagueOrgCards={leagueOrgCards} />;
    default:
      return <DashboardHomeView />;
  }
}
