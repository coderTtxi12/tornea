-- Repara 0003 + 0004 cuando Drizzle marcó migraciones aplicadas pero faltan tablas/columnas.
-- Uso: npm run db:ensure:match-football-detail

-- Enums
DO $$ BEGIN CREATE TYPE "public"."football_card_kind" AS ENUM('yellow', 'red', 'second_yellow');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."football_goal_kind" AS ENUM(
  'open_play', 'penalty_kick', 'direct_free_kick', 'indirect_free_kick', 'corner', 'header', 'other'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."football_penalty_attempt_outcome" AS ENUM(
  'scored', 'saved', 'missed', 'off_target', 'disallowed'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."football_period" AS ENUM(
  'first_half', 'second_half', 'extra_first', 'extra_second', 'penalty_shootout'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."lineup_slot" AS ENUM('starter', 'bench');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."football_foul_kind" AS ENUM(
  'violent_conduct', 'serious_foul_play', 'reckless_tackle', 'careless_foul', 'dissent',
  'unsporting_behavior', 'handball', 'offside', 'simulation', 'other'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tablas de acta (0003)
CREATE TABLE IF NOT EXISTS "match_lineups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "sport_code" text DEFAULT 'football' NOT NULL,
  "slot" "lineup_slot" NOT NULL,
  "position_code" text,
  "shirt_number" integer,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "match_lineups_match_team_player_unique" UNIQUE("match_id","team_id","player_id")
);

CREATE TABLE IF NOT EXISTS "match_cards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "player_id" uuid,
  "sport_code" text DEFAULT 'football' NOT NULL,
  "card_kind" "football_card_kind" NOT NULL,
  "period" "football_period",
  "minute" integer,
  "stoppage_minute" integer,
  "reason" text,
  "recorded_by_user_id" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "match_substitutions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "player_out_id" uuid NOT NULL,
  "player_in_id" uuid NOT NULL,
  "sport_code" text DEFAULT 'football' NOT NULL,
  "period" "football_period",
  "minute" integer,
  "stoppage_minute" integer,
  "reason" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "match_substitutions_distinct_players" CHECK ("player_out_id" <> "player_in_id")
);

CREATE TABLE IF NOT EXISTS "match_penalty_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "taker_id" uuid,
  "goalkeeper_id" uuid,
  "sport_code" text DEFAULT 'football' NOT NULL,
  "outcome" "football_penalty_attempt_outcome" NOT NULL,
  "period" "football_period",
  "minute" integer,
  "stoppage_minute" integer,
  "match_goal_id" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "match_fouls" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_id" uuid NOT NULL,
  "offending_team_id" uuid NOT NULL,
  "offending_player_id" uuid,
  "victim_player_id" uuid,
  "sport_code" text DEFAULT 'football' NOT NULL,
  "foul_kind" "football_foul_kind" NOT NULL,
  "period" "football_period",
  "minute" integer,
  "stoppage_minute" integer,
  "description" text,
  "advantage_played" boolean DEFAULT false NOT NULL,
  "referee_decision" text,
  "match_card_id" uuid,
  "league_sanction_id" uuid,
  "recorded_by_user_id" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sport_match_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_id" uuid NOT NULL,
  "sport_code" text DEFAULT 'football' NOT NULL,
  "event_key" text NOT NULL,
  "minute" integer,
  "stoppage_minute" integer,
  "period" "football_period",
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- FKs (idempotentes)
DO $$ BEGIN ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "match_cards" ADD CONSTRAINT "match_cards_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_cards" ADD CONSTRAINT "match_cards_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_cards" ADD CONSTRAINT "match_cards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_cards" ADD CONSTRAINT "match_cards_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "match_substitutions" ADD CONSTRAINT "match_substitutions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_substitutions" ADD CONSTRAINT "match_substitutions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_substitutions" ADD CONSTRAINT "match_substitutions_player_out_id_players_id_fk" FOREIGN KEY ("player_out_id") REFERENCES "public"."players"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_substitutions" ADD CONSTRAINT "match_substitutions_player_in_id_players_id_fk" FOREIGN KEY ("player_in_id") REFERENCES "public"."players"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "match_penalty_attempts" ADD CONSTRAINT "match_penalty_attempts_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_penalty_attempts" ADD CONSTRAINT "match_penalty_attempts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_penalty_attempts" ADD CONSTRAINT "match_penalty_attempts_taker_id_players_id_fk" FOREIGN KEY ("taker_id") REFERENCES "public"."players"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_penalty_attempts" ADD CONSTRAINT "match_penalty_attempts_goalkeeper_id_players_id_fk" FOREIGN KEY ("goalkeeper_id") REFERENCES "public"."players"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_penalty_attempts" ADD CONSTRAINT "match_penalty_attempts_match_goal_id_match_goals_id_fk" FOREIGN KEY ("match_goal_id") REFERENCES "public"."match_goals"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_offending_team_id_teams_id_fk" FOREIGN KEY ("offending_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_offending_player_id_players_id_fk" FOREIGN KEY ("offending_player_id") REFERENCES "public"."players"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_victim_player_id_players_id_fk" FOREIGN KEY ("victim_player_id") REFERENCES "public"."players"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_match_card_id_match_cards_id_fk" FOREIGN KEY ("match_card_id") REFERENCES "public"."match_cards"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "sport_match_events" ADD CONSTRAINT "sport_match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Índices
CREATE INDEX IF NOT EXISTS "match_lineups_match_id_idx" ON "match_lineups" ("match_id");
CREATE INDEX IF NOT EXISTS "match_lineups_team_id_idx" ON "match_lineups" ("team_id");
CREATE INDEX IF NOT EXISTS "match_cards_match_id_idx" ON "match_cards" ("match_id");
CREATE INDEX IF NOT EXISTS "match_cards_team_id_idx" ON "match_cards" ("team_id");
CREATE INDEX IF NOT EXISTS "match_cards_player_id_idx" ON "match_cards" ("player_id");
CREATE INDEX IF NOT EXISTS "match_substitutions_match_id_idx" ON "match_substitutions" ("match_id");
CREATE INDEX IF NOT EXISTS "match_substitutions_team_id_idx" ON "match_substitutions" ("team_id");
CREATE INDEX IF NOT EXISTS "match_penalty_attempts_match_id_idx" ON "match_penalty_attempts" ("match_id");
CREATE INDEX IF NOT EXISTS "match_penalty_attempts_team_id_idx" ON "match_penalty_attempts" ("team_id");
CREATE INDEX IF NOT EXISTS "match_fouls_match_id_idx" ON "match_fouls" ("match_id");
CREATE INDEX IF NOT EXISTS "match_fouls_offending_player_id_idx" ON "match_fouls" ("offending_player_id");
CREATE INDEX IF NOT EXISTS "sport_match_events_match_id_idx" ON "sport_match_events" ("match_id");
CREATE INDEX IF NOT EXISTS "sport_match_events_sport_key_idx" ON "sport_match_events" ("sport_code", "event_key");

-- match_goals + matches (columnas de 0003)
ALTER TABLE "match_goals" ADD COLUMN IF NOT EXISTS "sport_code" text DEFAULT 'football' NOT NULL;
ALTER TABLE "match_goals" ADD COLUMN IF NOT EXISTS "goal_kind" "football_goal_kind";
ALTER TABLE "match_goals" ADD COLUMN IF NOT EXISTS "period" "football_period";
ALTER TABLE "match_goals" ADD COLUMN IF NOT EXISTS "stoppage_minute" integer;
ALTER TABLE "match_goals" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;

ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "sport_code" text DEFAULT 'football' NOT NULL;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "ended_at" timestamp with time zone;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "regulation_minutes" integer DEFAULT 90;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "attendance" integer;
