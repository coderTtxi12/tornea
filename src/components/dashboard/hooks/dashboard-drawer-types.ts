import type { MyLeaguesMatchRow } from "@/components/dashboard/leagues/my-leagues-state";

export type DashboardDrawerState =
  | { kind: "closed" }
  | { kind: "new-league" }
  | { kind: "new-category"; leagueId: string; leagueName: string }
  | { kind: "edit-category"; leagueId: string; leagueName: string; categoryId: string }
  | { kind: "new-venue" }
  | { kind: "edit-venue"; leagueId: string; venueId: string }
  | { kind: "new-referee" }
  | { kind: "register-team" }
  | { kind: "edit-team"; leagueId: string; teamId: string }
  | { kind: "register-player"; prefillTeamId?: string }
  | { kind: "edit-player"; leagueId: string; teamId: string; playerId: string }
  | { kind: "player-sheet"; leagueId: string; teamId: string; playerId: string }
  | { kind: "new-match" }
  | { kind: "edit-match"; initialRow: MyLeaguesMatchRow };

export type DashboardDrawerFormKeys = {
  league: number;
  category: number;
  venue: number;
  team: number;
  player: number;
  match: number;
  referee: number;
};

export const INITIAL_DRAWER_FORM_KEYS: DashboardDrawerFormKeys = {
  league: 0,
  category: 0,
  venue: 0,
  team: 0,
  player: 0,
  match: 0,
  referee: 0,
};

export type DashboardDrawerOpeners = {
  openNewLeagueDrawer: () => void;
  openNewCategoryDrawer: (args: { leagueId: string; leagueName: string }) => void;
  openEditCategoryDrawer: (args: {
    leagueId: string;
    leagueName: string;
    categoryId: string;
  }) => void;
  openNewVenueDrawer: () => void;
  openEditVenueDrawer: (args: { leagueId: string; venueId: string }) => void;
  openNewRefereeDrawer: () => void;
  openRegisterTeamDrawer: () => void;
  openEditTeamDrawer: (args: { leagueId: string; teamId: string }) => void;
  openRegisterPlayerDrawer: (args?: { prefillTeamId?: string }) => void;
  openEditPlayerDrawer: (args: {
    leagueId: string;
    teamId: string;
    playerId: string;
  }) => void;
  openPlayerSheetDrawer: (args: {
    leagueId: string;
    teamId: string;
    playerId: string;
  }) => void;
  openNewMatchDrawer: () => void;
  openEditMatchDrawer: (row: MyLeaguesMatchRow) => void;
};
