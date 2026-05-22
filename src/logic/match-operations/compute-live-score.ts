type GoalRow = {
  teamId: string;
  isOwnGoal: boolean;
  homeTeamId: string;
  awayTeamId: string;
};

export function computeLiveScoreFromGoals(
  goals: readonly GoalRow[],
  homeTeamId: string,
  awayTeamId: string,
): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const g of goals) {
    const scoresForHome =
      (g.teamId === homeTeamId && !g.isOwnGoal) ||
      (g.teamId === awayTeamId && g.isOwnGoal);
    if (scoresForHome) home += 1;
    else away += 1;
  }
  return { home, away };
}
