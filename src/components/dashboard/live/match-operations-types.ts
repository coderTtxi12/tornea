import type { MatchOperationsBundle } from "@/logic/match-operations/get-match-operations-bundle";

export type { MatchOperationsBundle };

export type LiveMatchListItem = {
  id: string;
  leagueId: string;
  leagueName: string;
  categoryName: string | null;
  homeTeamName: string;
  awayTeamName: string;
  venueName: string | null;
  status: string;
  scheduledAt: string;
};
