# Match incidents & live operations — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock **Cancha · En vivo** section with a three-phase match operations flow (setup → lineups → live incidents + clock → finish) backed by existing football tables and `matches.report` workflow metadata.

**Architecture:** Server logic in `src/logic/match-operations/`; thin JSON API routes under `/api/leagues/[leagueId]/matches/[matchId]/operations/*`; client workspace in `src/components/dashboard/live/` mounted from `DashboardLiveView`. Workflow phase stored in `matches.report` (`operationsPhase`, timestamps, clock). Incidents write to `match_goals`, `match_cards`, `match_substitutions`, `match_fouls`, `match_penalty_attempts`. Points update `season_teams` on finish.

**Tech stack:** Next.js App Router, Drizzle ORM, Zod schemas, shadcn `Button`/`Card`/`Badge`, Lucide icons, Tornea CSS tokens (`brand-lime`, `brand-navy`, `floatCard`).

**Spec:** `docs/superpowers/specs/2026-05-21-match-incidents-business-logic.md`

**UI design:** `design-system/tornea/MASTER.md` + `design-system/tornea/pages/live.md` (Tornea brand overrides: navy surface, lime live pulse, teal accents; no emoji icons; 150–300ms transitions).

---

## File map

| Area | Files |
|------|--------|
| Workflow metadata | `src/logic/match-operations/match-operations-metadata.ts` |
| On-field rules | `src/logic/match-operations/match-player-state.ts` |
| Read bundle | `src/logic/match-operations/get-match-operations-bundle.ts` |
| Phase actions | `validate-match-setup.ts`, `save-match-lineups.ts`, `start-match-live.ts`, `tick-match-clock.ts` |
| Incidents | `record-match-goal.ts`, `record-match-card.ts`, `record-match-substitution.ts`, `record-match-foul.ts`, `record-match-penalty.ts` |
| Close | `finish-match.ts`, `apply-season-points-from-result.ts` |
| Schemas | `src/schemas/match-operations/*.ts` |
| API | `src/app/api/leagues/[leagueId]/matches/[matchId]/operations/**` |
| UI | `src/components/dashboard/live/*`, `DashboardLiveView.tsx` |

---

### Task 1: Workflow metadata & player state helpers

**Files:**
- Create: `src/logic/match-operations/match-operations-metadata.ts`
- Create: `src/logic/match-operations/match-player-state.ts`

- [ ] **Step 1:** Define `MatchOperationsPhase`: `setup` | `lineups` | `live` | `closed`
- [ ] **Step 2:** Define `MatchClockPeriod`: `first_half` | `halftime` | `second_half` | `ended`
- [ ] **Step 3:** `readMatchOperationsMetadata(report)` / `mergeMatchOperationsMetadata(prev, patch)`
- [ ] **Step 4:** `deriveOnFieldPlayerIds(lineups, substitutions, cards)` — starters + subs in − subs out − expelled
- [ ] **Step 5:** `countTeamFouls(fouls, teamId)` for 5-foul UI warning

### Task 2: Operations bundle (GET)

**Files:**
- Create: `src/logic/match-operations/get-match-operations-bundle.ts`
- Create: `src/app/api/leagues/[leagueId]/matches/[matchId]/operations/route.ts`

- [ ] **Step 1:** Load match + league auth (`userCanManageLeague`)
- [ ] **Step 2:** Join home/away names, venue, referee, category duration from `report` + category metadata fallback
- [ ] **Step 3:** Load `match_lineups`, roster candidates per `season_teams` via `list-team-roster-dashboard-rows`
- [ ] **Step 4:** Load incidents (goals, cards, subs, fouls, penalties) ordered by minute
- [ ] **Step 5:** Compute live score from goals (own-goal → rival), foul counts, on-field sets
- [ ] **Step 6:** `GET` returns JSON bundle for UI

### Task 3: Phase 1 — validate setup

**Files:**
- Create: `src/logic/match-operations/validate-match-setup.ts`
- Create: `src/schemas/match-operations/validate-setup-schema.ts`
- Create: `src/app/api/leagues/[leagueId]/matches/[matchId]/operations/validate-setup/route.ts`

- [ ] **Step 1:** Zod: teams distinct, `playersOnFieldPerTeam` 1–30, half minutes 1–120, break 0–60
- [ ] **Step 2:** Merge duration fields into `matches.report`, set `regulation_minutes`
- [ ] **Step 3:** Set `operationsPhase: 'lineups'`, `setupValidatedAt` ISO
- [ ] **Step 4:** Reject if match `status` is `finished` / `cancelled`

### Task 4: Phase 2 — lineups

**Files:**
- Create: `src/logic/match-operations/save-match-lineups.ts`
- Create: `src/schemas/match-operations/lineups-schema.ts`
- Create: `src/app/api/leagues/[leagueId]/matches/[matchId]/operations/lineups/route.ts`

- [ ] **Step 1:** Zod array: `{ teamId, playerId, slot: 'starter'|'bench' }`
- [ ] **Step 2:** Validate players on `team_rosters` for match `season_id` + team
- [ ] **Step 3:** Uniqueness per team/player; no player on both teams
- [ ] **Step 4:** Starters ≤ `playersOnFieldPerTeam` per team
- [ ] **Step 5:** Replace `match_lineups` rows in transaction; set `operationsPhase: 'live'` ready (`setup` done → phase `lineups` validated → `ready` or jump to allow start)
- [ ] **Step 6:** Set `lineupsValidatedAt`, `operationsPhase: 'ready'` (pre-kickoff)

### Task 5: Phase 3 — start & clock

**Files:**
- Create: `src/logic/match-operations/start-match-live.ts`
- Create: `src/logic/match-operations/tick-match-clock.ts`
- Create: `src/app/api/.../operations/start/route.ts`
- Create: `src/app/api/.../operations/clock/route.ts`

- [ ] **Step 1:** `start`: require phase `ready`, set `status: 'live'`, `started_at`, clock `first_half`, `operationsPhase: 'live'`
- [ ] **Step 2:** `clock` actions: `pause` | `resume` | `end_period` (first_half→halftime→second_half→ended)
- [ ] **Step 3:** Persist clock slice in `report.clock`

### Task 6: Incidents API

**Files:**
- Create: record-* logic files + `src/schemas/match-operations/incidents-schema.ts`
- Create: `src/app/api/.../operations/goals/route.ts` (POST)
- Create: `.../cards/route.ts`, `.../substitutions/route.ts`, `.../fouls/route.ts`, `.../penalties/route.ts`

- [ ] **Step 1:** All require `status === 'live'` and phase `live`
- [ ] **Step 2:** Goal: team, optional scorer/assist, period, minute, `goal_kind`, `is_own_goal`; update provisional scores in response only (DB goals canonical)
- [ ] **Step 3:** Card: if second yellow on same player → `second_yellow` + expelled flag in player state
- [ ] **Step 4:** Sub: same team, out on field, in on lineup or express-create player (reuse `create-player-in-team` + lineup row)
- [ ] **Step 5:** Foul: player + team; return `teamFoulCount` and `suggestDirectFreeKick` when count ≥ 5
- [ ] **Step 6:** Penalty: outcome; if `scored`, insert linked `match_goals` with `penalty_kick`

### Task 7: Finish match & points

**Files:**
- Create: `src/logic/match-operations/finish-match.ts`
- Create: `src/logic/match-operations/apply-season-points-from-result.ts`
- Create: `src/app/api/.../operations/finish/route.ts`
- Create: `src/schemas/match-operations/finish-schema.ts`

- [ ] **Step 1:** Validate `home_score` / `away_score`; compare sum of goals; allow `notes` on mismatch
- [ ] **Step 2:** Walkover modes: `home_no_show` | `away_no_show` | `both_no_show` | `played`
- [ ] **Step 3:** Set `status` (`finished` | `walkover`), `ended_at`, `operationsPhase: 'closed'`
- [ ] **Step 4:** Update both `season_teams`: `played`, `won`/`drawn`/`lost`, `goals_for/against`, `points` (3-0 walkover default, 3 win / 0 loss, 0-0 both absent)
- [ ] **Step 5:** Draw: 1 point each (Tornea default per spec)

### Task 8: Live UI (Cancha · En vivo)

**Files:**
- Create: `src/components/dashboard/live/LiveMatchList.tsx`
- Create: `src/components/dashboard/live/MatchOperationsWorkspace.tsx`
- Create: `src/components/dashboard/live/phases/SetupPhasePanel.tsx`
- Create: `src/components/dashboard/live/phases/LineupsPhasePanel.tsx`
- Create: `src/components/dashboard/live/phases/LivePhasePanel.tsx`
- Create: `src/components/dashboard/live/phases/FinishPhaseDialog.tsx`
- Create: `src/components/dashboard/live/IncidentEventFeed.tsx`
- Modify: `src/components/dashboard/views/DashboardLiveView.tsx`
- Modify: `design-system/tornea/pages/live.md`

- [ ] **Step 1:** Fetch `/api/leagues/my/matches`; filter `scheduled` | `live` for list
- [ ] **Step 2:** Master-detail layout: list left, workspace right (stack on mobile)
- [ ] **Step 3:** Step indicator (1 Setup → 2 Lineups → 3 Live) with disabled forward navigation
- [ ] **Step 4:** Setup form mirrors spec fields; “Validate match” → POST validate-setup
- [ ] **Step 5:** Lineups: per-team checklist from roster; starter cap from report
- [ ] **Step 6:** Live: clock display + pause/end period; action bar (Goal, Card, Sub, Foul, Penalty); event feed newest-first
- [ ] **Step 7:** 5-foul banner (warn, non-blocking); expelled players disabled in pickers
- [ ] **Step 8:** Finish dialog: score confirmation + walkover toggles
- [ ] **Step 9:** Lucide icons only; `cursor-pointer`; lime pulse on `live` badge; `prefers-reduced-motion` on pulse

### Task 9: Verification

- [ ] **Step 1:** `npm run build` exit 0
- [ ] **Step 2:** Manual: scheduled match → setup → lineups → start → goal → card (2 yellows expels) → finish → `season_teams.points` updated
- [ ] **Step 3:** Acceptance checklist from spec marked in PR description

---

## Self-review (spec coverage)

| Spec requirement | Task |
|------------------|------|
| Phase 1 mandatory fields | Task 3, 8 |
| Phase 2 roster rules + max on field | Task 4, 8 |
| Phase 3 clock periods | Task 5, 8 |
| Goals, cards, subs, fouls, penalties, assists | Task 6, 8 |
| 5-foul recommendation | Task 6, 8 |
| 2 yellows expulsion | Task 1, 6 |
| Final score validation | Task 7, 8 |
| Walkover / points | Task 7 |
| v1 out of scope (shootouts, extra time, committee) | Not in plan |

## Redux / scope

- No Redux; match workspace local state + refetch bundle after mutations.
- No new DB migrations (uses existing tables + `report` JSON).

---

### Task 10: Walkover UI (finish panel)

**Files:**
- Modify: `src/components/dashboard/live/MatchOperationsWorkspace.tsx` (`FinishPanel`)

- [x] Walkover buttons: away absent, home absent, both absent → `finish` API modes

### Task 11: Phase 1 — edit match via drawer

**Files:**
- Modify: `DashboardLiveView.tsx`, `DashboardViewSwitch.tsx`, `MatchOperationsWorkspace.tsx`

- [x] `onOpenEditMatchDrawer` wired from arena shell; “Editar datos del encuentro” in setup phase

### Task 12: Express roster player (lineups)

**Files:**
- Create: `src/logic/match-operations/add-express-roster-player.ts`
- Create: `src/app/api/.../operations/express-player/route.ts`
- Modify: `LineupsPanel` in `MatchOperationsWorkspace.tsx`

- [x] Minimal form (name, birth date, shirt #) → `createPlayerInTeam` → reload roster
