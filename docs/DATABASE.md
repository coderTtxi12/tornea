# Tornea — database design reference

Complete reference for PostgreSQL (Drizzle ORM): **enums**, **tables**, **columns**, plus **business conventions** the schema does not enforce by itself.

**Source of truth in code:** `src/db/schema.ts` (line-accurate types and FK behavior). Migrations: `drizzle/`. Apply: `npm run db:migrate` (via `scripts/migrate.cjs`, loads `.env` / `.env.local`). After schema edits: `npm run db:generate` for new migrations.

---

## Stack

- **Engine:** PostgreSQL (e.g. Supabase).
- **ORM:** Drizzle — types and queries from `src/db/schema.ts`.

---

## Entity hierarchy (multi-tenant by league)

```mermaid
flowchart TB
  users[users]
  leagues[leagues]
  league_members[league_members]
  seasons[seasons]
  teams[teams]
  season_teams[season_teams]
  players[players]
  venues[venues]
  matches[matches]

  users --> leagues
  users --> league_members
  leagues --> league_members
  leagues --> seasons
  leagues --> teams
  leagues --> venues
  leagues --> players
  seasons --> season_teams
  teams --> season_teams
  seasons --> matches
  teams --> matches
  players --> team_rosters
```

- **`leagues`:** Top-level organization (“tenant” for a competition).
- **`seasons`:** Competition edition under a league.
- **`teams`:** Clubs registered in a league; enrollment per season via **`season_teams`**.
- **`matches`:** Always tied to a **`season_id`**, with **`home_team_id`** and **`away_team_id`**.

---

## User identity

| Concept | Column / table | Notes |
|---------|----------------|-------|
| App user | `users.id` (UUID) | Business FKs target this. |
| Supabase login | `users.auth_user_id` (UUID, unique) | Mirrors `auth.users.id`; link on first sign-in or provisioning job. |

The database does **not** automatically insert `users` rows when someone signs up in Auth — that is application responsibility (webhook, Supabase trigger, or first-session flow).

---

## League roles

Table **`league_members`**: one row per (`league_id`, `user_id`) with a **`role`**.

A user may have **different roles in different leagues** (multiple rows). Billing / primary contact also appears as **`leagues.owner_user_id`**.

### Convention: `owner_user_id` vs role `owner`

The DB does **not** guarantee that `leagues.owner_user_id` always matches a `league_members` row with role `owner`.

**Recommended policy when creating a league:**

1. Insert **`leagues`** with **`owner_user_id`** = creating user.
2. Insert **`league_members`** for the same **`user_id`** with role **`owner`** (and **`accepted_at`** if you use invitations).

Any “transfer of ownership” should update **both** or define a single canonical rule in product.

---

## `sport_code`

Used on **`leagues`**, **`matches`**, and many sport-specific detail tables.

- There is **no FK** forcing a match’s **`sport_code`** to match its league’s **`sport_code`**.
- **Convention:** treat **`leagues.sport_code`** as source of truth; on create, copy from the league or **validate equality** in application code.

---

## Matches and teams

### Teams must belong to the match season

PostgreSQL does **not** enforce that **`matches.home_team_id`** / **`away_team_id`** have a **`season_teams`** row for **`matches.season_id`**.

**Validate in the app:** both teams must be enrolled in that season (`season_teams` for that `season_id` + `team_id`).

### Score vs goals

- **`matches.home_score`** / **`away_score`:** aggregate result.
- **`match_goals`:** per-goal detail.

They can **diverge** without an explicit policy.

| Approach | Description |
|----------|-------------|
| A | Score is canonical; goals are detail (validate sum when closing the match). |
| B | Goals are canonical; score is derived or read-only aggregate. |
| C | Both editable; reconcile before marking **finished**. |

Document the chosen policy in domain code.

---

## Discipline: three layers (do not conflate)

| Layer | Table(s) | Meaning |
|-------|----------|---------|
| Match sheet | `match_cards` | Yellow / red / second yellow shown on the official record. |
| Incidents / fouls | `match_fouls` | What happened on the pitch (violent conduct, tackle, etc.). Optional **`match_card_id`** if a card was shown. |
| Competition discipline | `sanctions` | Fines, match bans, committee records. Optional link from **`match_fouls.league_sanction_id`**. |

**Naming:** `sanction_kind` includes **`warning`** (a **league** disciplinary warning). That is **not** the same as a yellow card in **`match_cards`**.

---

## Football match detail (extensible via `sport_code` + `metadata`)

Dedicated tables cover structured football data. Default **`sport_code`** is **`football`** unless you evolve multi-sport.

---

## Generic match events vs dedicated tables

**`sport_match_events`** is for VAR-style keys, injuries, stoppages, etc., **without** duplicating rows that belong in **`match_cards`**, **`match_fouls`**, **`match_goals`**, etc.

**Convention:** use specific tables for structured data; use **`sport_match_events`** for integrations or events that do not yet have a first-class table. Stable **`event_key`** convention (e.g. `football.var_review`).

---

## Security and auditing

- The schema enforces **referential integrity** (FKs, `ON DELETE` / `ON UPDATE` behavior).
- It does **not** define **who** may read or write which row (multi-tenant authorization).

With Supabase, you typically add **Row Level Security (RLS)** and policies keyed by **`league_id`** / membership. Required for production if clients hit the DB or exposed APIs directly.

---

## Enums (PostgreSQL types)

| Enum | Values |
|------|--------|
| `league_status` | `draft`, `active`, `archived` |
| `league_billing_status` | `trial`, `active`, `past_due`, `cancelled` |
| `league_member_role` | `owner`, `admin`, `staff`, `referee`, `team_staff`, `viewer` |
| `season_status` | `scheduled`, `in_progress`, `completed`, `cancelled` |
| `season_format` | `round_robin`, `groups`, `knockout`, `mixed` |
| `team_status` | `active`, `inactive`, `withdrawn` |
| `match_status` | `scheduled`, `live`, `finished`, `postponed`, `cancelled`, `walkover` |
| `sanction_kind` | `suspension`, `fine`, `warning`, `ban` |
| `sanction_status` | `active`, `served`, `appealed`, `revoked` |
| `football_goal_kind` | `open_play`, `penalty_kick`, `direct_free_kick`, `indirect_free_kick`, `corner`, `header`, `other` |
| `football_card_kind` | `yellow`, `red`, `second_yellow` |
| `football_period` | `first_half`, `second_half`, `extra_first`, `extra_second`, `penalty_shootout` |
| `football_penalty_attempt_outcome` | `scored`, `saved`, `missed`, `off_target`, `disallowed` (in-game penalty kick, not shootout rounds) |
| `lineup_slot` | `starter`, `bench` |
| `match_report_kind` | `delegate`, `referee`, `press`, `internal` |
| `football_foul_kind` | `violent_conduct`, `serious_foul_play`, `reckless_tackle`, `careless_foul`, `dissent`, `unsporting_behavior`, `handball`, `offside`, `simulation`, `other` |

---

## Tables and columns

Column names below match **SQL** (snake_case). Types: **uuid**, **text**, **boolean**, **integer**, **date**, **timestamptz** (stored as `timestamp with time zone`), **jsonb**, **enum** (see above).

### `users`

Application profile linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Internal user id; FK target for app logic. |
| `auth_user_id` | uuid UNIQUE NOT NULL | Supabase `auth.users.id`. |
| `email` | text NOT NULL | Login email; unique index on `lower(email)`. |
| `display_name` | text | Display name. |
| `avatar_url` | text | Profile image URL. |
| `phone` | text | Phone number. |
| `locale` | text NOT NULL DEFAULT `es` | Locale preference. |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

### `leagues`

League / organization (tenant).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | League id. |
| `owner_user_id` | uuid FK → `users.id` | Primary owner (restrict on delete). |
| `slug` | text NOT NULL | URL slug; unique per `lower(slug)`. |
| `name` | text NOT NULL | Display name. |
| `sport_code` | text NOT NULL DEFAULT `football` | Sport identifier (no FK to a catalog). |
| `country_code` | text | Country (e.g. ISO). |
| `timezone` | text NOT NULL DEFAULT `America/Guayaquil` | Default timezone for scheduling. |
| `status` | `league_status` NOT NULL DEFAULT `draft` | Lifecycle. |
| `billing_status` | `league_billing_status` NOT NULL DEFAULT `trial` | Billing state. |
| `branding` | jsonb NOT NULL DEFAULT `{}` | Logos, colors, etc. |
| `rules` | jsonb NOT NULL DEFAULT `{}` | League rules payload. |
| `settings` | jsonb NOT NULL DEFAULT `{}` | Feature flags and settings. |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

### `league_members`

Membership and role per league.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row id. |
| `league_id` | uuid FK → `leagues.id` | League (cascade delete). |
| `user_id` | uuid FK → `users.id` | User (cascade delete). |
| `role` | `league_member_role` NOT NULL DEFAULT `viewer` | Role in this league. |
| `invited_by_user_id` | uuid FK → `users.id` | Who sent the invite (set null on delete). |
| `accepted_at` | timestamptz | When membership was accepted. |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

Unique: (`league_id`, `user_id`).

### `venues`

Playing venues owned by a league.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Venue id. |
| `league_id` | uuid FK → `leagues.id` | Owning league (cascade delete). |
| `name` | text NOT NULL | Venue name. |
| `address` | text | Address. |
| `notes` | text | Notes. |
| `sort_order` | integer NOT NULL DEFAULT 0 | Display order. |
| `is_active` | boolean NOT NULL DEFAULT true | Soft disable. |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

### `seasons`

Competition season under a league.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Season id. |
| `league_id` | uuid FK → `leagues.id` | League (cascade delete). |
| `name` | text NOT NULL | Season display name. |
| `slug` | text NOT NULL | Unique per league (`lower(slug)` with `league_id`). |
| `format` | `season_format` NOT NULL DEFAULT `round_robin` | Competition format. |
| `status` | `season_status` NOT NULL DEFAULT `scheduled` | Season lifecycle. |
| `starts_on` | date | Start date. |
| `ends_on` | date | End date. |
| `format_config` | jsonb NOT NULL DEFAULT `{}` | Groups, brackets, etc. |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

### `teams`

Team/club within a league.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Team id. |
| `league_id` | uuid FK → `leagues.id` | League (cascade delete). |
| `name` | text NOT NULL | Team name; unique per league via `lower(name)`. |
| `short_name` | text | Short name. |
| `crest_url` | text | Crest image URL. |
| `primary_color` | text | Brand primary color. |
| `secondary_color` | text | Brand secondary color. |
| `status` | `team_status` NOT NULL DEFAULT `active` | Team status. |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

### `season_teams`

Team enrollment in a season; holds **standings / stats** for that season.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Enrollment row id. |
| `season_id` | uuid FK → `seasons.id` | Season (cascade delete). |
| `team_id` | uuid FK → `teams.id` | Team (cascade delete). |
| `division` | text | Division or group label. |
| `seed` | integer | Seeding. |
| `points` | integer NOT NULL DEFAULT 0 | League points. |
| `played` | integer NOT NULL DEFAULT 0 | Matches played. |
| `won` | integer NOT NULL DEFAULT 0 | Wins. |
| `drawn` | integer NOT NULL DEFAULT 0 | Draws. |
| `lost` | integer NOT NULL DEFAULT 0 | Losses. |
| `goals_for` | integer NOT NULL DEFAULT 0 | Goals scored. |
| `goals_against` | integer NOT NULL DEFAULT 0 | Goals conceded. |
| `position` | integer | Table position. |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | Extra stats / tags. |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

Unique: (`season_id`, `team_id`).

### `players`

Player person registered in a league (global player pool for the league).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Player id. |
| `league_id` | uuid FK → `leagues.id` | League (cascade delete). |
| `user_id` | uuid FK → `users.id` | Linked app user (set null on delete). |
| `full_name` | text NOT NULL | Full name. |
| `doc_id` | text | ID document reference. |
| `birth_date` | date | Date of birth. |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | Extra fields. |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

**App validation:** when adding to a roster, **`players.league_id`** should match **`teams.league_id`** for the roster’s team.

### `team_rosters`

Player registered to a **team** for a **season**.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Roster row id. |
| `season_id` | uuid FK → `seasons.id` | Season (cascade delete). |
| `team_id` | uuid FK → `teams.id` | Team (cascade delete). |
| `player_id` | uuid FK → `players.id` | Player (cascade delete). |
| `shirt_number` | integer | Shirt number. |
| `position` | text | Position label. |
| `registered_at` | timestamptz NOT NULL DEFAULT now() | Registration time. |

Unique: (`season_id`, `team_id`, `player_id`).

### `team_staff_links`

Staff users attached to a **season enrollment** (`season_teams`).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Link id. |
| `season_team_id` | uuid FK → `season_teams.id` | Season team row (cascade delete). |
| `user_id` | uuid FK → `users.id` | Staff user (cascade delete). |
| `label` | text | Role label (coach, physio, etc.). |
| `created_at` | timestamptz NOT NULL | Creation time. |

Unique: (`season_team_id`, `user_id`).

### `matches`

Single match in a season.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Match id. |
| `season_id` | uuid FK → `seasons.id` | Season (cascade delete). |
| `matchday` | integer | Matchday number. |
| `round_label` | text | Knockout / round label. |
| `venue_id` | uuid FK → `venues.id` | Venue (set null on delete). |
| `scheduled_at` | timestamptz NOT NULL | Kickoff (scheduled). |
| `timezone` | text NOT NULL DEFAULT `America/Guayaquil` | Interpretation of local fields. |
| `home_team_id` | uuid FK → `teams.id` | Home team (restrict delete). |
| `away_team_id` | uuid FK → `teams.id` | Away team (restrict delete). |
| `sport_code` | text NOT NULL DEFAULT `football` | Sport. |
| `status` | `match_status` NOT NULL DEFAULT `scheduled` | Match state. |
| `home_score` | integer | Final home goals (summary). |
| `away_score` | integer | Final away goals (summary). |
| `started_at` | timestamptz | Actual start (optional). |
| `ended_at` | timestamptz | Actual end (optional). |
| `regulation_minutes` | integer DEFAULT 90 | Regulation length (e.g. 90 for football 11). |
| `attendance` | integer | Spectators. |
| `notes` | text | Free-form notes. |
| `report` | jsonb NOT NULL DEFAULT `{}` | Structured report blob. |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

Check: `home_team_id <> away_team_id`.

### `match_goals`

Goals scored in a match.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Goal row id. |
| `match_id` | uuid FK → `matches.id` | Match (cascade delete). |
| `team_id` | uuid FK → `teams.id` | Scoring team (cascade delete). |
| `scorer_player_id` | uuid FK → `players.id` | Scorer (set null). |
| `assist_player_id` | uuid FK → `players.id` | Assist (set null). |
| `sport_code` | text NOT NULL DEFAULT `football` | Sport. |
| `goal_kind` | `football_goal_kind` | How the goal was scored. |
| `period` | `football_period` | Half / extra / shootout phase. |
| `minute` | integer | Minute of regulation/extra. |
| `stoppage_minute` | integer | Added time minute. |
| `is_own_goal` | boolean NOT NULL DEFAULT false | Own goal flag. |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | Extra data. |
| `created_at` | timestamptz NOT NULL | Insert time. |

### `match_officials`

Users assigned as officials for a match.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row id. |
| `match_id` | uuid FK → `matches.id` | Match (cascade delete). |
| `user_id` | uuid FK → `users.id` | Official user (cascade delete). |
| `role` | text NOT NULL DEFAULT `referee` | Role string (referee, AR, etc.). |
| `notes` | text | Notes. |
| `created_at` | timestamptz NOT NULL | Creation time. |

Unique: (`match_id`, `user_id`, `role`).

### `match_lineups`

Lineup snapshot per match and team (may differ from seasonal roster).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row id. |
| `match_id` | uuid FK → `matches.id` | Match (cascade delete). |
| `team_id` | uuid FK → `teams.id` | Team (cascade delete). |
| `player_id` | uuid FK → `players.id` | Player (cascade delete). |
| `sport_code` | text NOT NULL DEFAULT `football` | Sport. |
| `slot` | `lineup_slot` NOT NULL | Starter or bench. |
| `position_code` | text | e.g. GK, CB, ST (free text for i18n / other sports). |
| `shirt_number` | integer | Shirt number for this match. |
| `sort_order` | integer NOT NULL DEFAULT 0 | Display order. |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | Extra data. |
| `created_at` | timestamptz NOT NULL | Creation time. |

Unique: (`match_id`, `team_id`, `player_id`).

### `match_cards`

Cards shown on the match record.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row id. |
| `match_id` | uuid FK → `matches.id` | Match (cascade delete). |
| `team_id` | uuid FK → `teams.id` | Team (cascade delete). |
| `player_id` | uuid FK → `players.id` | Player (set null). |
| `sport_code` | text NOT NULL DEFAULT `football` | Sport. |
| `card_kind` | `football_card_kind` NOT NULL | Yellow / red / second yellow. |
| `period` | `football_period` | Half / extra. |
| `minute` | integer | Minute. |
| `stoppage_minute` | integer | Stoppage minute. |
| `reason` | text | Reason text. |
| `recorded_by_user_id` | uuid FK → `users.id` | Recorder (set null). |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | Extra data. |
| `created_at` | timestamptz NOT NULL | Creation time. |

### `match_substitutions`

Substitutions during the match.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row id. |
| `match_id` | uuid FK → `matches.id` | Match (cascade delete). |
| `team_id` | uuid FK → `teams.id` | Team (cascade delete). |
| `player_out_id` | uuid FK → `players.id` | Player leaving (cascade delete). |
| `player_in_id` | uuid FK → `players.id` | Player entering (cascade delete). |
| `sport_code` | text NOT NULL DEFAULT `football` | Sport. |
| `period` | `football_period` | Half / extra. |
| `minute` | integer | Minute. |
| `stoppage_minute` | integer | Stoppage minute. |
| `reason` | text | Reason. |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | Extra data. |
| `created_at` | timestamptz NOT NULL | Creation time. |

Check: `player_out_id <> player_in_id`.

### `match_penalty_attempts`

In-game penalty kicks (not the shootout tie-breaker). Link to **`match_goals`** if scored.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row id. |
| `match_id` | uuid FK → `matches.id` | Match (cascade delete). |
| `team_id` | uuid FK → `teams.id` | Team (cascade delete). |
| `taker_id` | uuid FK → `players.id` | Taker (set null). |
| `goalkeeper_id` | uuid FK → `players.id` | Keeper (set null). |
| `sport_code` | text NOT NULL DEFAULT `football` | Sport. |
| `outcome` | `football_penalty_attempt_outcome` NOT NULL | Result of the attempt. |
| `period` | `football_period` | Period. |
| `minute` | integer | Minute. |
| `stoppage_minute` | integer | Stoppage minute. |
| `match_goal_id` | uuid FK → `match_goals.id` | If converted, link to goal row (set null). |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | Extra data. |
| `created_at` | timestamptz NOT NULL | Creation time. |

### `penalty_shootouts`

Penalty shootout attached to a match (e.g. cups). At most one per match.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Shootout id. |
| `match_id` | uuid FK → `matches.id` | Match (cascade delete). |
| `sport_code` | text NOT NULL DEFAULT `football` | Sport. |
| `home_hits` | integer NOT NULL DEFAULT 0 | Successful kicks for **home** team side of the match. |
| `away_hits` | integer NOT NULL DEFAULT 0 | Successful kicks for **away** team side. |
| `winner_team_id` | uuid FK → `teams.id` | Winner (set null). |
| `settings` | jsonb NOT NULL DEFAULT `{}` | Shootout config. |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

Unique: (`match_id`). **`home_hits` / `away_hits`** align with match **home/away**, not a neutral “team A/B”.

### `penalty_shootout_kicks`

Individual kicks in a shootout.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Kick id. |
| `shootout_id` | uuid FK → `penalty_shootouts.id` | Parent shootout (cascade delete). |
| `sequence_index` | integer NOT NULL | Order in the shootout (unique per shootout). |
| `team_id` | uuid FK → `teams.id` | Taking team (cascade delete). |
| `taker_id` | uuid FK → `players.id` | Taker (set null). |
| `goalkeeper_id` | uuid FK → `players.id` | Keeper (set null). |
| `sport_code` | text NOT NULL DEFAULT `football` | Sport. |
| `scored` | boolean NOT NULL | Whether the kick scored. |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | Extra data. |
| `created_at` | timestamptz NOT NULL | Creation time. |

### `match_report_submissions`

Free-text or structured reports (delegate, referee, press, internal).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row id. |
| `match_id` | uuid FK → `matches.id` | Match (cascade delete). |
| `author_user_id` | uuid FK → `users.id` | Author (set null). |
| `kind` | `match_report_kind` NOT NULL DEFAULT `internal` | Report type. |
| `title` | text | Title. |
| `body` | text | Body text. |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | Extra data. |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

### `sport_match_events`

Generic keyed events (`event_key` + `payload`) for things without a dedicated table yet.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row id. |
| `match_id` | uuid FK → `matches.id` | Match (cascade delete). |
| `sport_code` | text NOT NULL DEFAULT `football` | Sport. |
| `event_key` | text NOT NULL | Stable key, e.g. `football.var_review`. |
| `minute` | integer | Minute. |
| `stoppage_minute` | integer | Stoppage minute. |
| `period` | `football_period` | Period. |
| `payload` | jsonb NOT NULL DEFAULT `{}` | Event-specific JSON. |
| `sort_order` | integer NOT NULL DEFAULT 0 | Ordering. |
| `created_at` | timestamptz NOT NULL | Creation time. |

### `sanctions`

League-level disciplinary sanctions (not the same as a yellow card row in `match_cards`).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Sanction id. |
| `league_id` | uuid FK → `leagues.id` | League (cascade delete). |
| `season_id` | uuid FK → `seasons.id` | Optional season scope (set null). |
| `player_id` | uuid FK → `players.id` | Subject player (set null). |
| `team_id` | uuid FK → `teams.id` | Subject team (set null). |
| `match_id` | uuid FK → `matches.id` | Related match (set null). |
| `kind` | `sanction_kind` NOT NULL | suspension / fine / warning / ban. |
| `status` | `sanction_status` NOT NULL DEFAULT `active` | Sanction lifecycle. |
| `title` | text NOT NULL | Short title. |
| `description` | text | Long description. |
| `fine_amount_cents` | integer | Fine in minor currency units. |
| `currency` | text NOT NULL DEFAULT `USD` | ISO currency code. |
| `matches_remaining` | integer | Suspension matches remaining. |
| `starts_on` | date | Effective start. |
| `ends_on` | date | Effective end. |
| `created_by_user_id` | uuid FK → `users.id` | Creator (set null). |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

### `match_fouls`

On-pitch fouls / incidents; optional link to **`match_cards`** and post-match **`sanctions`**.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row id. |
| `match_id` | uuid FK → `matches.id` | Match (cascade delete). |
| `offending_team_id` | uuid FK → `teams.id` | Fouling team (cascade delete). |
| `offending_player_id` | uuid FK → `players.id` | Fouling player (set null). |
| `victim_player_id` | uuid FK → `players.id` | Victim player (set null). |
| `sport_code` | text NOT NULL DEFAULT `football` | Sport. |
| `foul_kind` | `football_foul_kind` NOT NULL | Classification. |
| `period` | `football_period` | Period. |
| `minute` | integer | Minute. |
| `stoppage_minute` | integer | Stoppage minute. |
| `description` | text | Narrative. |
| `advantage_played` | boolean NOT NULL DEFAULT false | Advantage played. |
| `referee_decision` | text | Referee notes. |
| `match_card_id` | uuid FK → `match_cards.id` | Card issued for this incident (set null). |
| `league_sanction_id` | uuid FK → `sanctions.id` | League sanction after review (set null). |
| `recorded_by_user_id` | uuid FK → `users.id` | Recorder (set null). |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | Extra data. |
| `created_at` | timestamptz NOT NULL | Creation time. |

### `sponsor_slots`

Sponsor placements for a league.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Slot id. |
| `league_id` | uuid FK → `leagues.id` | League (cascade delete). |
| `name` | text NOT NULL | Sponsor name. |
| `image_url` | text | Image URL. |
| `target_url` | text | Click-through URL. |
| `display_order` | integer NOT NULL DEFAULT 0 | Sort order. |
| `is_active` | boolean NOT NULL DEFAULT true | Active flag. |
| `starts_at` | timestamptz | Campaign start. |
| `ends_at` | timestamptz | Campaign end. |
| `created_at` | timestamptz NOT NULL | Creation time. |
| `updated_at` | timestamptz NOT NULL | Last update. |

### `prize_draws`

Prize draws / raffles scoped to a season.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Draw id. |
| `season_id` | uuid FK → `seasons.id` | Season (cascade delete). |
| `title` | text NOT NULL | Title. |
| `description` | text | Description. |
| `drawn_at` | timestamptz | When the draw occurred. |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | Winners, entries, etc. |
| `created_at` | timestamptz NOT NULL | Creation time. |

---

## Drizzle relations

`src/db/schema.ts` exports Drizzle **`relations()`** for `users`, `leagues`, and `leagueMembers` to support relational query APIs. Extend relations as needed for other tables.

---

## Migrations

- Numbered SQL files under `drizzle/`; journal in `drizzle/meta/_journal.json`.
- **Apply:** `npm run db:migrate`.
- Triggers: e.g. `set_updated_at()` on some tables (see migration `0001` and football migrations).

---

*Update this document in the same PR when you change `src/db/schema.ts`.*
