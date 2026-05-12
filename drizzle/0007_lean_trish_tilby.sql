CREATE TYPE "public"."league_category_gender" AS ENUM('male', 'female', 'mixed', 'unspecified');--> statement-breakpoint
CREATE TABLE "league_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"gender" "league_category_gender" DEFAULT 'unspecified' NOT NULL,
	"age_min" integer,
	"age_max" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "league_category_id" uuid;--> statement-breakpoint
ALTER TABLE "season_teams" ADD COLUMN "league_category_id" uuid;--> statement-breakpoint
ALTER TABLE "league_categories" ADD CONSTRAINT "league_categories_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "league_categories_league_code_lower_idx" ON "league_categories" USING btree ("league_id",lower("code"));--> statement-breakpoint
CREATE INDEX "league_categories_league_id_idx" ON "league_categories" USING btree ("league_id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_league_category_id_league_categories_id_fk" FOREIGN KEY ("league_category_id") REFERENCES "public"."league_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_league_category_id_league_categories_id_fk" FOREIGN KEY ("league_category_id") REFERENCES "public"."league_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_league_category_id_idx" ON "matches" USING btree ("league_category_id");--> statement-breakpoint
CREATE INDEX "season_teams_league_category_id_idx" ON "season_teams" USING btree ("league_category_id");