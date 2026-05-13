-- Repara bases donde `0003_football_match_details` quedó registrada pero la columna no existe
-- (p. ej. otra DATABASE_URL, restore parcial, o fallo al aplicar el ALTER).
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "sport_code" text DEFAULT 'football' NOT NULL;
