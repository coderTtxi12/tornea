-- Idempotent repair when 0003 journal entry exists but enums/columns on match_goals were never applied.
DO $$ BEGIN
  CREATE TYPE "public"."football_card_kind" AS ENUM('yellow', 'red', 'second_yellow');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."football_goal_kind" AS ENUM(
    'open_play', 'penalty_kick', 'direct_free_kick', 'indirect_free_kick', 'corner', 'header', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."football_penalty_attempt_outcome" AS ENUM(
    'scored', 'saved', 'missed', 'off_target', 'disallowed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."football_period" AS ENUM(
    'first_half', 'second_half', 'extra_first', 'extra_second', 'penalty_shootout'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."lineup_slot" AS ENUM('starter', 'bench');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."match_report_kind" AS ENUM('delegate', 'referee', 'press', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "match_goals" ADD COLUMN IF NOT EXISTS "sport_code" text DEFAULT 'football' NOT NULL;--> statement-breakpoint
ALTER TABLE "match_goals" ADD COLUMN IF NOT EXISTS "goal_kind" "football_goal_kind";--> statement-breakpoint
ALTER TABLE "match_goals" ADD COLUMN IF NOT EXISTS "period" "football_period";--> statement-breakpoint
ALTER TABLE "match_goals" ADD COLUMN IF NOT EXISTS "stoppage_minute" integer;--> statement-breakpoint
ALTER TABLE "match_goals" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
