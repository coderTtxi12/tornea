"use client";

import { useCallback, useEffect, useState } from "react";

import type { MyLeaguesMatchRow } from "@/components/dashboard/leagues/my-leagues-state";

import {
  INITIAL_DRAWER_FORM_KEYS,
  type DashboardDrawerFormKeys,
  type DashboardDrawerOpeners,
  type DashboardDrawerState,
} from "./dashboard-drawer-types";

export function useDashboardDrawer(): {
  drawer: DashboardDrawerState;
  drawerBusy: boolean;
  setDrawerBusy: (busy: boolean) => void;
  closeDrawer: () => void;
  formKeys: DashboardDrawerFormKeys;
  openers: DashboardDrawerOpeners;
} {
  const [drawer, setDrawer] = useState<DashboardDrawerState>({ kind: "closed" });
  const [formKeys, setFormKeys] = useState(INITIAL_DRAWER_FORM_KEYS);
  const [drawerBusy, setDrawerBusy] = useState(false);

  const bump = useCallback((key: keyof DashboardDrawerFormKeys) => {
    setFormKeys((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer({ kind: "closed" });
  }, []);

  const openNewLeagueDrawer = useCallback(() => {
    bump("league");
    setDrawer({ kind: "new-league" });
  }, [bump]);

  const openNewCategoryDrawer = useCallback(
    (args: { leagueId: string; leagueName: string }) => {
      bump("category");
      setDrawer({ kind: "new-category", ...args });
    },
    [bump],
  );

  const openEditCategoryDrawer = useCallback(
    (args: { leagueId: string; leagueName: string; categoryId: string }) => {
      bump("category");
      setDrawer({ kind: "edit-category", ...args });
    },
    [bump],
  );

  const openNewVenueDrawer = useCallback(() => {
    bump("venue");
    setDrawer({ kind: "new-venue" });
  }, [bump]);

  const openEditVenueDrawer = useCallback(
    (args: { leagueId: string; venueId: string }) => {
      bump("venue");
      setDrawer({ kind: "edit-venue", ...args });
    },
    [bump],
  );

  const openNewRefereeDrawer = useCallback(() => {
    bump("referee");
    setDrawer({ kind: "new-referee" });
  }, [bump]);

  const openRegisterTeamDrawer = useCallback(() => {
    bump("team");
    setDrawer({ kind: "register-team" });
  }, [bump]);

  const openEditTeamDrawer = useCallback(
    (args: { leagueId: string; teamId: string }) => {
      bump("team");
      setDrawer({ kind: "edit-team", ...args });
    },
    [bump],
  );

  const openRegisterPlayerDrawer = useCallback(
    (args?: { prefillTeamId?: string }) => {
      bump("player");
      setDrawer({ kind: "register-player", prefillTeamId: args?.prefillTeamId });
    },
    [bump],
  );

  const openEditPlayerDrawer = useCallback(
    (args: { leagueId: string; teamId: string; playerId: string }) => {
      bump("player");
      setDrawer({ kind: "edit-player", ...args });
    },
    [bump],
  );

  const openPlayerSheetDrawer = useCallback(
    (args: { leagueId: string; teamId: string; playerId: string }) => {
      setDrawer({ kind: "player-sheet", ...args });
    },
    [],
  );

  const openNewMatchDrawer = useCallback(() => {
    bump("match");
    setDrawer({ kind: "new-match" });
  }, [bump]);

  const openEditMatchDrawer = useCallback(
    (row: MyLeaguesMatchRow) => {
      bump("match");
      setDrawer({ kind: "edit-match", initialRow: row });
    },
    [bump],
  );

  useEffect(() => {
    setDrawerBusy(false);
  }, [drawer.kind]);

  const openers: DashboardDrawerOpeners = {
    openNewLeagueDrawer,
    openNewCategoryDrawer,
    openEditCategoryDrawer,
    openNewVenueDrawer,
    openEditVenueDrawer,
    openNewRefereeDrawer,
    openRegisterTeamDrawer,
    openEditTeamDrawer,
    openRegisterPlayerDrawer,
    openEditPlayerDrawer,
    openPlayerSheetDrawer,
    openNewMatchDrawer,
    openEditMatchDrawer,
  };

  return {
    drawer,
    drawerBusy,
    setDrawerBusy,
    closeDrawer,
    formKeys,
    openers,
  };
}
