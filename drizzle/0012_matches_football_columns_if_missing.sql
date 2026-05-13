-- Alinea `matches` con 0003 si la base quedó sin started_at / ended_at / etc.
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "sport_code" text DEFAULT 'football' NOT NULL;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "ended_at" timestamp with time zone;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "regulation_minutes" integer DEFAULT 90;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "attendance" integer;
