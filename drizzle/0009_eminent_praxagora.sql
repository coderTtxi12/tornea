CREATE TYPE "public"."app_audit_action" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TABLE "app_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_display_name_snapshot" text,
	"actor_email_snapshot" text,
	"actor_league_role" "league_member_role",
	"league_id" uuid,
	"action" "app_audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_audit_logs" ADD CONSTRAINT "app_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_audit_logs" ADD CONSTRAINT "app_audit_logs_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_audit_logs_league_id_created_at_idx" ON "app_audit_logs" USING btree ("league_id","created_at");--> statement-breakpoint
CREATE INDEX "app_audit_logs_actor_user_id_created_at_idx" ON "app_audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "app_audit_logs_entity_type_entity_id_idx" ON "app_audit_logs" USING btree ("entity_type","entity_id");