"use client";

import { DashboardRightSlideover } from "@/components/dashboard/DashboardRightSlideover";
import type {
  DashboardDrawerFormKeys,
  DashboardDrawerState,
} from "@/components/dashboard/hooks/dashboard-drawer-types";
import {
  NewLeagueCategoryForm,
  NewLeagueForm,
  NewLeagueRefereeForm,
  NewMatchForm,
  NewPlayerForm,
  NewTeamForm,
  NewVenueForm,
  PlayerTechnicalSheetPanel,
  type DashboardMyLeaguesState,
} from "@/components/dashboard/leagues";

import { drawerDescription, drawerTitle } from "./drawer-copy";

export type DashboardArenaDrawerProps = {
  drawer: DashboardDrawerState;
  formKeys: DashboardDrawerFormKeys;
  drawerBusy: boolean;
  setDrawerBusy: (busy: boolean) => void;
  closeDrawer: () => void;
  myLeagues: DashboardMyLeaguesState;
  onLeagueCreated?: () => void;
  onEditPlayerFromSheet: (args: {
    leagueId: string;
    teamId: string;
    playerId: string;
  }) => void;
};

export function DashboardArenaDrawer({
  drawer,
  formKeys,
  drawerBusy,
  setDrawerBusy,
  closeDrawer,
  myLeagues,
  onLeagueCreated,
  onEditPlayerFromSheet,
}: DashboardArenaDrawerProps) {
  if (drawer.kind === "closed") {
    return null;
  }

  return (
    <DashboardRightSlideover
      open
      size={drawer.kind === "player-sheet" ? "2xl" : "xl"}
      preventClose={drawerBusy}
      title={drawerTitle(drawer)}
      description={drawerDescription(drawer)}
      onClose={closeDrawer}
    >
      {drawer.kind === "new-league" ? (
        <NewLeagueForm
          key={formKeys.league}
          variant="drawer"
          onCancel={closeDrawer}
          onBusyChange={setDrawerBusy}
          onLeagueCreated={() => {
            onLeagueCreated?.();
            closeDrawer();
          }}
        />
      ) : drawer.kind === "new-category" || drawer.kind === "edit-category" ? (
        <NewLeagueCategoryForm
          key={
            drawer.kind === "edit-category"
              ? `edit-category-${drawer.leagueId}-${drawer.categoryId}-${formKeys.category}`
              : `${drawer.leagueId}-${formKeys.category}`
          }
          leagueId={drawer.leagueId}
          leagueName={drawer.leagueName}
          editTarget={
            drawer.kind === "edit-category"
              ? { leagueId: drawer.leagueId, categoryId: drawer.categoryId }
              : null
          }
          onClose={closeDrawer}
          onBusyChange={setDrawerBusy}
          onCategoryCreated={onLeagueCreated}
        />
      ) : (drawer.kind === "new-match" || drawer.kind === "edit-match") &&
        myLeagues.status === "ready" ? (
        <NewMatchForm
          key={
            drawer.kind === "edit-match"
              ? `edit-match-${drawer.initialRow.id}-${formKeys.match}`
              : `new-match-${formKeys.match}`
          }
          leagues={myLeagues.items}
          venues={myLeagues.venues}
          referees={myLeagues.referees}
          editRow={drawer.kind === "edit-match" ? drawer.initialRow : null}
          onClose={closeDrawer}
          onBusyChange={setDrawerBusy}
          onMatchCreated={onLeagueCreated}
        />
      ) : drawer.kind === "new-referee" && myLeagues.status === "ready" ? (
        <NewLeagueRefereeForm
          key={`new-referee-${formKeys.referee}`}
          leagues={myLeagues.items}
          onClose={closeDrawer}
          onBusyChange={setDrawerBusy}
          onRefereeCreated={onLeagueCreated}
        />
      ) : drawer.kind === "player-sheet" ? (
        <PlayerTechnicalSheetPanel
          key={`sheet-${drawer.leagueId}-${drawer.teamId}-${drawer.playerId}`}
          leagueId={drawer.leagueId}
          teamId={drawer.teamId}
          playerId={drawer.playerId}
          onClose={closeDrawer}
          onRequestEdit={() => onEditPlayerFromSheet({
            leagueId: drawer.leagueId,
            teamId: drawer.teamId,
            playerId: drawer.playerId,
          })}
        />
      ) : (drawer.kind === "new-venue" || drawer.kind === "edit-venue") &&
        myLeagues.status === "ready" ? (
        <NewVenueForm
          key={
            drawer.kind === "edit-venue"
              ? `edit-venue-${drawer.leagueId}-${drawer.venueId}-${formKeys.venue}`
              : `new-venue-${formKeys.venue}`
          }
          leagues={myLeagues.items}
          editTarget={
            drawer.kind === "edit-venue"
              ? { leagueId: drawer.leagueId, venueId: drawer.venueId }
              : null
          }
          onClose={closeDrawer}
          onBusyChange={setDrawerBusy}
          onVenueCreated={onLeagueCreated}
        />
      ) : myLeagues.status === "ready" &&
        (drawer.kind === "register-team" || drawer.kind === "edit-team") ? (
        <NewTeamForm
          key={
            drawer.kind === "edit-team"
              ? `edit-${drawer.leagueId}-${drawer.teamId}`
              : `register-${formKeys.team}`
          }
          leagues={myLeagues.items}
          editTarget={
            drawer.kind === "edit-team"
              ? { leagueId: drawer.leagueId, teamId: drawer.teamId }
              : null
          }
          onClose={closeDrawer}
          onBusyChange={setDrawerBusy}
          onTeamCreated={() => {
            onLeagueCreated?.();
            closeDrawer();
          }}
        />
      ) : myLeagues.status === "ready" &&
        (drawer.kind === "register-player" || drawer.kind === "edit-player") ? (
        <NewPlayerForm
          key={
            drawer.kind === "edit-player"
              ? `edit-player-${drawer.leagueId}-${drawer.teamId}-${drawer.playerId}`
              : `player-${formKeys.player}`
          }
          teamRows={myLeagues.teams}
          prefillTeamId={drawer.kind === "register-player" ? drawer.prefillTeamId : undefined}
          editTarget={
            drawer.kind === "edit-player"
              ? {
                  leagueId: drawer.leagueId,
                  teamId: drawer.teamId,
                  playerId: drawer.playerId,
                }
              : null
          }
          onClose={closeDrawer}
          onBusyChange={setDrawerBusy}
          onPlayerCreated={() => {
            closeDrawer();
            onLeagueCreated?.();
          }}
        />
      ) : null}
    </DashboardRightSlideover>
  );
}
