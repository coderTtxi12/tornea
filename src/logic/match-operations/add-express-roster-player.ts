import { loadMatchForOperations } from "./match-operations-access";
import { createPlayerInTeam } from "@/logic/players/create-player-in-team";

export type AddExpressRosterPlayerInput = {
  actorUserId: string;
  leagueId: string;
  matchId: string;
  teamId: string;
  fullName: string;
  birthDate: string;
  shirtNumber?: number | null;
};

export type AddExpressRosterPlayerResult =
  | { ok: true; playerId: string }
  | {
      ok: false;
      reason: "forbidden" | "not_found" | "bad_team" | "invalid_phase" | "create_failed";
    };

export async function addExpressRosterPlayer(
  input: AddExpressRosterPlayerInput,
): Promise<AddExpressRosterPlayerResult> {
  const loaded = await loadMatchForOperations(
    input.actorUserId,
    input.leagueId,
    input.matchId,
  );
  if (!loaded.ok) return loaded;

  const { ctx } = loaded;
  if (input.teamId !== ctx.homeTeamId && input.teamId !== ctx.awayTeamId) {
    return { ok: false, reason: "bad_team" };
  }

  try {
    const created = await createPlayerInTeam({
      ownerUserId: input.actorUserId,
      leagueId: input.leagueId,
      teamId: input.teamId,
      fullName: input.fullName.trim(),
      birthDate: input.birthDate,
      shirtNumber: input.shirtNumber ?? null,
      position: null,
      whatsappE164: null,
      docId: null,
    });
    return { ok: true, playerId: created.playerId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "FORBIDDEN") return { ok: false, reason: "forbidden" };
    if (msg === "NOT_FOUND" || msg === "TEAM_NOT_FOUND") {
      return { ok: false, reason: "not_found" };
    }
    return { ok: false, reason: "create_failed" };
  }
}
