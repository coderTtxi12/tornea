ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "league_referee_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_league_referee_id_league_referees_id_fk" FOREIGN KEY ("league_referee_id") REFERENCES "public"."league_referees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_league_referee_id_idx" ON "matches" USING btree ("league_referee_id");
