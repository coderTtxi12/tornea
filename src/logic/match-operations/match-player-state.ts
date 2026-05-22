type LineupSlot = "starter" | "bench";
type CardKind = "yellow" | "red" | "second_yellow";

type LineupRow = {
  teamId: string;
  playerId: string;
  slot: LineupSlot;
};

type SubRow = {
  teamId: string;
  playerOutId: string;
  playerInId: string;
};

type CardRow = {
  teamId: string;
  playerId: string | null;
  cardKind: CardKind;
};

/** Players currently on the pitch per team. */
export function deriveOnFieldByTeam(
  lineups: readonly LineupRow[],
  substitutions: readonly SubRow[],
  cards: readonly CardRow[],
): Map<string, Set<string>> {
  const onField = new Map<string, Set<string>>();

  for (const row of lineups) {
    if (row.slot !== "starter") continue;
    let set = onField.get(row.teamId);
    if (!set) {
      set = new Set();
      onField.set(row.teamId, set);
    }
    set.add(row.playerId);
  }

  for (const sub of substitutions) {
    const set = onField.get(sub.teamId);
    if (!set) continue;
    set.delete(sub.playerOutId);
    set.add(sub.playerInId);
  }

  const expelled = new Set<string>();
  const yellows = new Map<string, number>();
  for (const card of cards) {
    if (!card.playerId) continue;
    const key = `${card.teamId}:${card.playerId}`;
    if (card.cardKind === "red" || card.cardKind === "second_yellow") {
      expelled.add(key);
      continue;
    }
    if (card.cardKind === "yellow") {
      yellows.set(key, (yellows.get(key) ?? 0) + 1);
      if ((yellows.get(key) ?? 0) >= 2) expelled.add(key);
    }
  }

  for (const [teamId, players] of onField) {
    for (const playerId of [...players]) {
      if (expelled.has(`${teamId}:${playerId}`)) {
        players.delete(playerId);
      }
    }
  }

  return onField;
}

/** Suplentes del acta (`slot=bench`) que aún no están en cancha ni expulsados. */
export function deriveAvailableBenchByTeam(
  lineups: readonly LineupRow[],
  substitutions: readonly SubRow[],
  cards: readonly CardRow[],
): Map<string, string[]> {
  const onField = deriveOnFieldByTeam(lineups, substitutions, cards);
  const byTeam = new Map<string, string[]>();

  for (const row of lineups) {
    if (row.slot !== "bench") continue;
    if (onField.get(row.teamId)?.has(row.playerId)) continue;
    if (isPlayerExpelled(row.teamId, row.playerId, cards)) continue;
    const list = byTeam.get(row.teamId);
    if (list) list.push(row.playerId);
    else byTeam.set(row.teamId, [row.playerId]);
  }

  return byTeam;
}

export function isPlayerExpelled(
  teamId: string,
  playerId: string,
  cards: readonly CardRow[],
): boolean {
  let yellows = 0;
  for (const card of cards) {
    if (card.playerId !== playerId || card.teamId !== teamId) continue;
    if (card.cardKind === "red" || card.cardKind === "second_yellow") return true;
    if (card.cardKind === "yellow") {
      yellows += 1;
      if (yellows >= 2) return true;
    }
  }
  return false;
}

export function countTeamFouls(
  fouls: readonly { offendingTeamId: string }[],
  teamId: string,
): number {
  return fouls.filter((f) => f.offendingTeamId === teamId).length;
}

export function lineupPlayerIdsForTeam(
  lineups: readonly LineupRow[],
  teamId: string,
): Set<string> {
  return new Set(
    lineups.filter((l) => l.teamId === teamId).map((l) => l.playerId),
  );
}

export function countStarters(
  lineups: readonly LineupRow[],
  teamId: string,
): number {
  return lineups.filter((l) => l.teamId === teamId && l.slot === "starter").length;
}

type RosterRef = { teamId: string; playerId: string };

/** Añade `bench` para cada jugador del plantel que no es titular en `entries`. */
export function expandLineupEntriesWithAutoBench<
  T extends { teamId: string; playerId: string; slot: LineupSlot },
>(entries: readonly T[], roster: readonly RosterRef[]): T[] {
  const result = [...entries];
  const keys = new Set(entries.map((e) => `${e.teamId}:${e.playerId}`));
  const starterKeys = new Set(
    entries.filter((e) => e.slot === "starter").map((e) => `${e.teamId}:${e.playerId}`),
  );

  for (const { teamId, playerId } of roster) {
    const key = `${teamId}:${playerId}`;
    if (starterKeys.has(key) || keys.has(key)) continue;
    result.push({ teamId, playerId, slot: "bench" } as T);
    keys.add(key);
  }

  return result;
}
