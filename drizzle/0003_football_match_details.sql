CREATE TYPE "public"."football_card_kind" AS ENUM('yellow', 'red', 'second_yellow');--> statement-breakpoint
CREATE TYPE "public"."football_goal_kind" AS ENUM('open_play', 'penalty_kick', 'direct_free_kick', 'indirect_free_kick', 'corner', 'header', 'other');--> statement-breakpoint
CREATE TYPE "public"."football_penalty_attempt_outcome" AS ENUM('scored', 'saved', 'missed', 'off_target', 'disallowed');--> statement-breakpoint
CREATE TYPE "public"."football_period" AS ENUM('first_half', 'second_half', 'extra_first', 'extra_second', 'penalty_shootout');--> statement-breakpoint
CREATE TYPE "public"."lineup_slot" AS ENUM('starter', 'bench');--> statement-breakpoint
CREATE TYPE "public"."match_report_kind" AS ENUM('delegate', 'referee', 'press', 'internal');--> statement-breakpoint
CREATE TABLE "match_cards" (
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
--> statement-breakpoint
CREATE TABLE "match_lineups" (
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
--> statement-breakpoint
CREATE TABLE "match_penalty_attempts" (
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
--> statement-breakpoint
CREATE TABLE "match_report_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"author_user_id" uuid,
	"kind" "match_report_kind" DEFAULT 'internal' NOT NULL,
	"title" text,
	"body" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_substitutions" (
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
	CONSTRAINT "match_substitutions_distinct_players" CHECK ("match_substitutions"."player_out_id" <> "match_substitutions"."player_in_id")
);
--> statement-breakpoint
CREATE TABLE "penalty_shootout_kicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shootout_id" uuid NOT NULL,
	"sequence_index" integer NOT NULL,
	"team_id" uuid NOT NULL,
	"taker_id" uuid,
	"goalkeeper_id" uuid,
	"sport_code" text DEFAULT 'football' NOT NULL,
	"scored" boolean NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "penalty_shootout_kicks_order_unique" UNIQUE("shootout_id","sequence_index")
);
--> statement-breakpoint
CREATE TABLE "penalty_shootouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"sport_code" text DEFAULT 'football' NOT NULL,
	"home_hits" integer DEFAULT 0 NOT NULL,
	"away_hits" integer DEFAULT 0 NOT NULL,
	"winner_team_id" uuid,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "penalty_shootouts_match_unique" UNIQUE("match_id")
);
--> statement-breakpoint
CREATE TABLE "sport_match_events" (
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
--> statement-breakpoint
ALTER TABLE "match_goals" ADD COLUMN "sport_code" text DEFAULT 'football' NOT NULL;--> statement-breakpoint
ALTER TABLE "match_goals" ADD COLUMN "goal_kind" "football_goal_kind";--> statement-breakpoint
ALTER TABLE "match_goals" ADD COLUMN "period" "football_period";--> statement-breakpoint
ALTER TABLE "match_goals" ADD COLUMN "stoppage_minute" integer;--> statement-breakpoint
ALTER TABLE "match_goals" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "sport_code" text DEFAULT 'football' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "regulation_minutes" integer DEFAULT 90;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "attendance" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "match_cards" ADD CONSTRAINT "match_cards_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_cards" ADD CONSTRAINT "match_cards_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_cards" ADD CONSTRAINT "match_cards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_cards" ADD CONSTRAINT "match_cards_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_penalty_attempts" ADD CONSTRAINT "match_penalty_attempts_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_penalty_attempts" ADD CONSTRAINT "match_penalty_attempts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_penalty_attempts" ADD CONSTRAINT "match_penalty_attempts_taker_id_players_id_fk" FOREIGN KEY ("taker_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_penalty_attempts" ADD CONSTRAINT "match_penalty_attempts_goalkeeper_id_players_id_fk" FOREIGN KEY ("goalkeeper_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_penalty_attempts" ADD CONSTRAINT "match_penalty_attempts_match_goal_id_match_goals_id_fk" FOREIGN KEY ("match_goal_id") REFERENCES "public"."match_goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_report_submissions" ADD CONSTRAINT "match_report_submissions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_report_submissions" ADD CONSTRAINT "match_report_submissions_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_substitutions" ADD CONSTRAINT "match_substitutions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_substitutions" ADD CONSTRAINT "match_substitutions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_substitutions" ADD CONSTRAINT "match_substitutions_player_out_id_players_id_fk" FOREIGN KEY ("player_out_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_substitutions" ADD CONSTRAINT "match_substitutions_player_in_id_players_id_fk" FOREIGN KEY ("player_in_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_shootout_kicks" ADD CONSTRAINT "penalty_shootout_kicks_shootout_id_penalty_shootouts_id_fk" FOREIGN KEY ("shootout_id") REFERENCES "public"."penalty_shootouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_shootout_kicks" ADD CONSTRAINT "penalty_shootout_kicks_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_shootout_kicks" ADD CONSTRAINT "penalty_shootout_kicks_taker_id_players_id_fk" FOREIGN KEY ("taker_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_shootout_kicks" ADD CONSTRAINT "penalty_shootout_kicks_goalkeeper_id_players_id_fk" FOREIGN KEY ("goalkeeper_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_shootouts" ADD CONSTRAINT "penalty_shootouts_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_shootouts" ADD CONSTRAINT "penalty_shootouts_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sport_match_events" ADD CONSTRAINT "sport_match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_cards_match_id_idx" ON "match_cards" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_cards_team_id_idx" ON "match_cards" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "match_cards_player_id_idx" ON "match_cards" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "match_lineups_match_id_idx" ON "match_lineups" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_lineups_team_id_idx" ON "match_lineups" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "match_penalty_attempts_match_id_idx" ON "match_penalty_attempts" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_penalty_attempts_team_id_idx" ON "match_penalty_attempts" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "match_report_submissions_match_id_idx" ON "match_report_submissions" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_substitutions_match_id_idx" ON "match_substitutions" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_substitutions_team_id_idx" ON "match_substitutions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "penalty_shootout_kicks_shootout_id_idx" ON "penalty_shootout_kicks" USING btree ("shootout_id");--> statement-breakpoint
CREATE INDEX "penalty_shootouts_match_id_idx" ON "penalty_shootouts" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "sport_match_events_match_id_idx" ON "sport_match_events" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "sport_match_events_sport_key_idx" ON "sport_match_events" USING btree ("sport_code","event_key");--> statement-breakpoint
CREATE TRIGGER penalty_shootouts_set_updated_at
  BEFORE UPDATE ON penalty_shootouts
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();--> statement-breakpoint
CREATE TRIGGER match_report_submissions_set_updated_at
  BEFORE UPDATE ON match_report_submissions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();