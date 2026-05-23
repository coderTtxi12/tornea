import type { MatchOperationsBundle } from "@/components/dashboard/live/match-operations-types";

export type ScoreBarDatum = {
  team: string;
  goals: number;
  side: "home" | "away";
};

export type GoalsByMinuteDatum = {
  minute: string;
  home: number;
  away: number;
};

export type CardsPieDatum = {
  type: string;
  count: number;
  fill: string;
};

export type FoulsBarDatum = {
  team: string;
  fouls: number;
  side: "home" | "away";
};

export type TimelineBucketDatum = {
  bucket: string;
  incidents: number;
};

export function buildScoreBarData(bundle: MatchOperationsBundle): ScoreBarDatum[] {
  return [
    {
      team: bundle.match.homeTeamName,
      goals: bundle.liveScore.home,
      side: "home",
    },
    {
      team: bundle.match.awayTeamName,
      goals: bundle.liveScore.away,
      side: "away",
    },
  ];
}

export function buildGoalsByMinuteData(bundle: MatchOperationsBundle): GoalsByMinuteDatum[] {
  const { homeTeamId, awayTeamId } = bundle.match;
  const byMinute = new Map<number, { home: number; away: number }>();

  for (const g of bundle.goals) {
    const minute = g.minute ?? 0;
    const row = byMinute.get(minute) ?? { home: 0, away: 0 };
    if (g.teamId === homeTeamId) row.home += 1;
    else if (g.teamId === awayTeamId) row.away += 1;
    byMinute.set(minute, row);
  }

  return [...byMinute.entries()]
    .sort(([a], [b]) => a - b)
    .map(([minute, counts]) => ({
      minute: minute > 0 ? `${minute}′` : "—",
      home: counts.home,
      away: counts.away,
    }));
}

export function buildCardsPieData(bundle: MatchOperationsBundle): CardsPieDatum[] {
  let yellow = 0;
  let red = 0;
  for (const c of bundle.cards) {
    if (c.cardKind === "red" || c.cardKind === "second_yellow") red += 1;
    else yellow += 1;
  }
  const data: CardsPieDatum[] = [];
  if (yellow > 0) data.push({ type: "Amarillas", count: yellow, fill: "var(--color-yellow)" });
  if (red > 0) data.push({ type: "Rojas", count: red, fill: "var(--color-red)" });
  return data;
}

export function buildFoulsBarData(bundle: MatchOperationsBundle): FoulsBarDatum[] {
  return [
    {
      team: bundle.match.homeTeamName,
      fouls: bundle.foulCounts.home,
      side: "home",
    },
    {
      team: bundle.match.awayTeamName,
      fouls: bundle.foulCounts.away,
      side: "away",
    },
  ];
}

/** Ventanas de 15 minutos con total de incidencias (goles, tarjetas, cambios, faltas). */
export function buildTimelineBucketData(bundle: MatchOperationsBundle): TimelineBucketDatum[] {
  const counts = new Map<number, number>();

  const bump = (minute: number | null) => {
    const bucket = Math.floor((minute ?? 0) / 15);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  };

  for (const g of bundle.goals) bump(g.minute);
  for (const c of bundle.cards) bump(c.minute);
  for (const s of bundle.substitutions) bump(s.minute);
  for (const f of bundle.fouls) bump(f.minute);

  const maxBucket = counts.size > 0 ? Math.max(...counts.keys()) : 0;
  const lastBucket = Math.max(5, maxBucket);
  const rows: TimelineBucketDatum[] = [];
  for (let i = 0; i <= lastBucket; i++) {
    const start = i * 15;
    const end = start + 14;
    rows.push({
      bucket: `${start}–${end}′`,
      incidents: counts.get(i) ?? 0,
    });
  }
  return rows;
}

export function countLineupStarters(bundle: MatchOperationsBundle, teamId: string): number {
  return bundle.lineups.filter((l) => l.teamId === teamId && l.slot === "starter").length;
}
