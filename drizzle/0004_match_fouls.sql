CREATE TYPE "public"."football_foul_kind" AS ENUM('violent_conduct', 'serious_foul_play', 'reckless_tackle', 'careless_foul', 'dissent', 'unsporting_behavior', 'handball', 'offside', 'simulation', 'other');--> statement-breakpoint
CREATE TABLE "match_fouls" (
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
--> statement-breakpoint
ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_offending_team_id_teams_id_fk" FOREIGN KEY ("offending_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_offending_player_id_players_id_fk" FOREIGN KEY ("offending_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_victim_player_id_players_id_fk" FOREIGN KEY ("victim_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_match_card_id_match_cards_id_fk" FOREIGN KEY ("match_card_id") REFERENCES "public"."match_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_league_sanction_id_sanctions_id_fk" FOREIGN KEY ("league_sanction_id") REFERENCES "public"."sanctions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_fouls" ADD CONSTRAINT "match_fouls_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_fouls_match_id_idx" ON "match_fouls" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_fouls_offending_player_id_idx" ON "match_fouls" USING btree ("offending_player_id");--> statement-breakpoint
CREATE INDEX "match_fouls_victim_player_id_idx" ON "match_fouls" USING btree ("victim_player_id");--> statement-breakpoint
CREATE INDEX "match_fouls_league_sanction_id_idx" ON "match_fouls" USING btree ("league_sanction_id");