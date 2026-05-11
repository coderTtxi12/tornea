-- Rename Firebase identifier to Supabase Auth user id (UUID).
-- If legacy rows contain non-UUID strings, they get a new UUID (relink users in app or delete stale rows first).

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_firebase_uid_unique";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "firebase_uid" TO "auth_user_id";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "auth_user_id" SET DATA TYPE uuid USING (
  CASE
    WHEN trim(both from "auth_user_id"::text) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    THEN trim(both from "auth_user_id"::text)::uuid
    ELSE gen_random_uuid()
  END
);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_auth_user_id_unique" UNIQUE ("auth_user_id");
