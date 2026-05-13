-- Tabla `league_referees` (migración 0013). Idempotente.
-- Útil si `npm run db:migrate` apuntó a otra base que `next dev` o si Drizzle marcó migraciones sin crear la tabla.
-- Uso: npm run db:apply:sql -- scripts/sql/ensure-league-referees.sql

CREATE TABLE IF NOT EXISTS "league_referees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"whatsapp" text NOT NULL,
	"email" text,
	"curp" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "league_referees" ADD CONSTRAINT "league_referees_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "league_referees_league_id_idx" ON "league_referees" USING btree ("league_id");

CREATE INDEX IF NOT EXISTS "league_referees_league_sort_idx" ON "league_referees" USING btree ("league_id","sort_order");
