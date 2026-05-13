-- Opcional: `matches.league_referee_id` (migración 0014). Idempotente.
-- Uso: npm run db:apply:sql -- scripts/sql/ensure-matches-league-referee-id.sql

ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "league_referee_id" uuid;

DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_league_referee_id_league_referees_id_fk" FOREIGN KEY ("league_referee_id") REFERENCES "public"."league_referees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "matches_league_referee_id_idx" ON "matches" USING btree ("league_referee_id");
