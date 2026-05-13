-- Parche mínimo si solo te falta esta columna (equivale a drizzle/0003_football_match_details.sql línea ~132).
-- Preferí `npm run db:migrate` contra la MISMA DATABASE_URL que Next.js.
-- Si ya corrés migraciones completas, no hace falta ejecutar esto a mano.

ALTER TABLE "players"
  ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
