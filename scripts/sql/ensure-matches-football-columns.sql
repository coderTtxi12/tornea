-- Columnas de `matches` introducidas en migración 0003_football_match_details.
-- Idempotente: sirve si solo aplicaste sport_code o la base quedó a medias.
-- Uso: npm run db:apply:sql -- scripts/sql/ensure-matches-football-columns.sql

ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "sport_code" text DEFAULT 'football' NOT NULL;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "ended_at" timestamp with time zone;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "regulation_minutes" integer DEFAULT 90;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "attendance" integer;
