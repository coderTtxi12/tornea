"use client";

import { DashboardRightRail } from "./DashboardRightRail";
import {
  DashboardEmptyLeaguesPanel,
  LeaguesMainError,
  LeaguesMainLoading,
  type DashboardMyLeaguesState,
} from "./leagues";
import type { DashboardDrawerOpeners } from "./hooks/dashboard-drawer-types";
import { useDashboardDrawer } from "./hooks/use-dashboard-drawer";
import { DashboardArenaDrawer } from "./layout/DashboardArenaDrawer";
import { DashboardArenaHeader } from "./layout/DashboardArenaHeader";
import {
  DashboardNavPillMobile,
  DashboardNavSidebar,
  type DashboardNavKey,
} from "./nav";
import { DashboardViewSwitch } from "./views";

export type DashboardArenaLayoutProps = {
  nav: DashboardNavKey;
  avatarUrl: string | null;
  avatarInitial: string;
  onSignOut: () => void;
  signingOut: boolean;
  authConfigured: boolean;
  myLeagues: DashboardMyLeaguesState;
  railRefreshKey?: number;
  onLeagueCreated?: () => void;
  onLoadMorePlayers?: () => Promise<{
    ok: boolean;
    playerCount: number;
    hasMore: boolean;
  } | null>;
  playersLoadingMore?: boolean;
  onLoadMoreTeams?: () => Promise<{
    ok: boolean;
    teamCount: number;
    hasMore: boolean;
  } | null>;
  teamsLoadingMore?: boolean;
};

export function DashboardArenaLayout({
  nav,
  avatarUrl,
  avatarInitial,
  onSignOut,
  signingOut,
  authConfigured,
  myLeagues,
  railRefreshKey = 0,
  onLeagueCreated,
  onLoadMorePlayers,
  playersLoadingMore,
  onLoadMoreTeams,
  teamsLoadingMore,
}: DashboardArenaLayoutProps) {
  const {
    drawer,
    drawerBusy,
    setDrawerBusy,
    closeDrawer,
    formKeys,
    openers,
  } = useDashboardDrawer();

  const hasLeagues =
    myLeagues.status === "ready" && myLeagues.items.length > 0;

  return (
    <div
      className="bg-background text-foreground flex min-h-dvh w-full antialiased"
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <DashboardNavSidebar active={nav} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <DashboardArenaHeader
          avatarUrl={avatarUrl}
          avatarInitial={avatarInitial}
          onSignOut={onSignOut}
          signingOut={signingOut}
          authConfigured={authConfigured}
        />

        <DashboardNavPillMobile active={nav} />

        <div className="bg-background flex min-h-0 flex-1">
          <main className="min-h-0 flex-1 overflow-y-auto bg-background px-3 py-5 sm:px-5 lg:px-6 lg:py-8">
            <div className="mx-auto max-w-5xl xl:max-w-none xl:pr-2 2xl:max-w-[calc(100vw-22rem)]">
              {myLeagues.status === "loading" ? (
                <LeaguesMainLoading />
              ) : myLeagues.status === "error" ? (
                <LeaguesMainError
                  message={myLeagues.message}
                  onRetry={myLeagues.onRetry}
                />
              ) : !hasLeagues ? (
                <DashboardEmptyLeaguesPanel
                  onOpenNewLeagueDrawer={openers.openNewLeagueDrawer}
                />
              ) : (
                <DashboardViewSwitchWithOpeners
                  nav={nav}
                  myLeagues={myLeagues}
                  openers={openers}
                  onLoadMorePlayers={onLoadMorePlayers}
                  playersLoadingMore={playersLoadingMore}
                  onLoadMoreTeams={onLoadMoreTeams}
                  teamsLoadingMore={teamsLoadingMore}
                  fixtureDataRefreshKey={railRefreshKey}
                />
              )}
            </div>
          </main>

          {hasLeagues ? <DashboardRightRail refreshKey={railRefreshKey} /> : null}
        </div>
      </div>

      <DashboardArenaDrawer
        drawer={drawer}
        formKeys={formKeys}
        drawerBusy={drawerBusy}
        setDrawerBusy={setDrawerBusy}
        closeDrawer={closeDrawer}
        myLeagues={myLeagues}
        onLeagueCreated={onLeagueCreated}
        onEditPlayerFromSheet={openers.openEditPlayerDrawer}
      />
    </div>
  );
}

function DashboardViewSwitchWithOpeners({
  nav,
  myLeagues,
  openers,
  onLoadMorePlayers,
  playersLoadingMore,
  onLoadMoreTeams,
  teamsLoadingMore,
  fixtureDataRefreshKey,
}: {
  nav: DashboardNavKey;
  myLeagues: Extract<DashboardMyLeaguesState, { status: "ready" }>;
  openers: DashboardDrawerOpeners;
  onLoadMorePlayers?: DashboardArenaLayoutProps["onLoadMorePlayers"];
  playersLoadingMore?: boolean;
  onLoadMoreTeams?: DashboardArenaLayoutProps["onLoadMoreTeams"];
  teamsLoadingMore?: boolean;
  fixtureDataRefreshKey: number;
}) {
  return (
    <DashboardViewSwitch
      nav={nav}
      leagueOrgCards={myLeagues.items}
      teamRows={myLeagues.teams}
      teamsNextCursor={myLeagues.teamsNextCursor}
      playerRows={myLeagues.players}
      playersNextCursor={myLeagues.playersNextCursor}
      onLoadMorePlayers={onLoadMorePlayers}
      playersLoadingMore={playersLoadingMore}
      onOpenNewLeagueDrawer={openers.openNewLeagueDrawer}
      onOpenNewCategoryDrawer={openers.openNewCategoryDrawer}
      onOpenEditCategoryDrawer={openers.openEditCategoryDrawer}
      onOpenNewVenueDrawer={openers.openNewVenueDrawer}
      onOpenEditVenueDrawer={openers.openEditVenueDrawer}
      venueRows={myLeagues.venues}
      refereeRows={myLeagues.referees}
      onOpenNewRefereeDrawer={openers.openNewRefereeDrawer}
      onOpenRegisterTeamDrawer={openers.openRegisterTeamDrawer}
      onOpenEditTeamDrawer={openers.openEditTeamDrawer}
      onOpenRegisterPlayerDrawer={openers.openRegisterPlayerDrawer}
      onOpenPlayerSheetDrawer={openers.openPlayerSheetDrawer}
      onOpenNewMatchDrawer={openers.openNewMatchDrawer}
      onOpenEditMatchDrawer={openers.openEditMatchDrawer}
      fixtureDataRefreshKey={fixtureDataRefreshKey}
      onLoadMoreTeams={onLoadMoreTeams}
      teamsLoadingMore={teamsLoadingMore}
    />
  );
}
