CREATE TYPE "public"."league_billing_status" AS ENUM('trial', 'active', 'past_due', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."league_member_role" AS ENUM('owner', 'admin', 'staff', 'referee', 'team_staff', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."league_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'finished', 'postponed', 'cancelled', 'walkover');--> statement-breakpoint
CREATE TYPE "public"."sanction_kind" AS ENUM('suspension', 'fine', 'warning', 'ban');--> statement-breakpoint
CREATE TYPE "public"."sanction_status" AS ENUM('active', 'served', 'appealed', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."season_format" AS ENUM('round_robin', 'groups', 'knockout', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."season_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."team_status" AS ENUM('active', 'inactive', 'withdrawn');--> statement-breakpoint
CREATE TABLE "league_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "league_member_role" DEFAULT 'viewer' NOT NULL,
	"invited_by_user_id" uuid,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_members_league_user_unique" UNIQUE("league_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sport_code" text DEFAULT 'football' NOT NULL,
	"country_code" text,
	"timezone" text DEFAULT 'America/Guayaquil' NOT NULL,
	"status" "league_status" DEFAULT 'draft' NOT NULL,
	"billing_status" "league_billing_status" DEFAULT 'trial' NOT NULL,
	"branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"scorer_player_id" uuid,
	"assist_player_id" uuid,
	"minute" integer,
	"is_own_goal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_officials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'referee' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_officials_match_user_role_unique" UNIQUE("match_id","user_id","role")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"matchday" integer,
	"round_label" text,
	"venue_id" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'America/Guayaquil' NOT NULL,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"notes" text,
	"report" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_distinct_teams" CHECK ("matches"."home_team_id" <> "matches"."away_team_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"doc_id" text,
	"birth_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prize_draws" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"drawn_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sanctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"season_id" uuid,
	"player_id" uuid,
	"team_id" uuid,
	"match_id" uuid,
	"kind" "sanction_kind" NOT NULL,
	"status" "sanction_status" DEFAULT 'active' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"fine_amount_cents" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"matches_remaining" integer,
	"starts_on" date,
	"ends_on" date,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "season_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"division" text,
	"seed" integer,
	"points" integer DEFAULT 0 NOT NULL,
	"played" integer DEFAULT 0 NOT NULL,
	"won" integer DEFAULT 0 NOT NULL,
	"drawn" integer DEFAULT 0 NOT NULL,
	"lost" integer DEFAULT 0 NOT NULL,
	"goals_for" integer DEFAULT 0 NOT NULL,
	"goals_against" integer DEFAULT 0 NOT NULL,
	"position" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "season_teams_season_team_unique" UNIQUE("season_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"format" "season_format" DEFAULT 'round_robin' NOT NULL,
	"status" "season_status" DEFAULT 'scheduled' NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"format_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsor_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"target_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_rosters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"shirt_number" integer,
	"position" text,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_rosters_season_team_player_unique" UNIQUE("season_id","team_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "team_staff_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_staff_links_season_team_user_unique" UNIQUE("season_team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"crest_url" text,
	"primary_color" text,
	"secondary_color" text,
	"status" "team_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"phone" text,
	"locale" text DEFAULT 'es' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_goals" ADD CONSTRAINT "match_goals_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_goals" ADD CONSTRAINT "match_goals_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_goals" ADD CONSTRAINT "match_goals_scorer_player_id_players_id_fk" FOREIGN KEY ("scorer_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_goals" ADD CONSTRAINT "match_goals_assist_player_id_players_id_fk" FOREIGN KEY ("assist_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_officials" ADD CONSTRAINT "match_officials_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_officials" ADD CONSTRAINT "match_officials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prize_draws" ADD CONSTRAINT "prize_draws_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_slots" ADD CONSTRAINT "sponsor_slots_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_rosters" ADD CONSTRAINT "team_rosters_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_rosters" ADD CONSTRAINT "team_rosters_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_rosters" ADD CONSTRAINT "team_rosters_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_staff_links" ADD CONSTRAINT "team_staff_links_season_team_id_season_teams_id_fk" FOREIGN KEY ("season_team_id") REFERENCES "public"."season_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_staff_links" ADD CONSTRAINT "team_staff_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "league_members_league_id_idx" ON "league_members" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "league_members_user_id_idx" ON "league_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leagues_slug_lower_idx" ON "leagues" USING btree (lower("slug"));--> statement-breakpoint
CREATE INDEX "leagues_owner_user_id_idx" ON "leagues" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "leagues_status_idx" ON "leagues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "match_goals_match_id_idx" ON "match_goals" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_officials_match_id_idx" ON "match_officials" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_officials_user_id_idx" ON "match_officials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "matches_season_id_idx" ON "matches" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "matches_scheduled_at_idx" ON "matches" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "matches_venue_id_idx" ON "matches" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "matches_home_team_id_idx" ON "matches" USING btree ("home_team_id");--> statement-breakpoint
CREATE INDEX "matches_away_team_id_idx" ON "matches" USING btree ("away_team_id");--> statement-breakpoint
CREATE INDEX "players_league_id_idx" ON "players" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "players_user_id_idx" ON "players" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prize_draws_season_id_idx" ON "prize_draws" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "sanctions_league_id_idx" ON "sanctions" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "sanctions_player_id_idx" ON "sanctions" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "sanctions_team_id_idx" ON "sanctions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "season_teams_season_id_idx" ON "season_teams" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "season_teams_team_id_idx" ON "season_teams" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_league_slug_lower_idx" ON "seasons" USING btree ("league_id",lower("slug"));--> statement-breakpoint
CREATE INDEX "seasons_league_id_idx" ON "seasons" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "seasons_status_idx" ON "seasons" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sponsor_slots_league_id_idx" ON "sponsor_slots" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "team_rosters_season_id_idx" ON "team_rosters" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "team_rosters_team_id_idx" ON "team_rosters" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_rosters_player_id_idx" ON "team_rosters" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "team_staff_links_user_id_idx" ON "team_staff_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_league_name_lower_idx" ON "teams" USING btree ("league_id",lower("name"));--> statement-breakpoint
CREATE INDEX "teams_league_id_idx" ON "teams" USING btree ("league_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "venues_league_id_idx" ON "venues" USING btree ("league_id");