CREATE TABLE "dashboard_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contact_full_name" text NOT NULL,
	"whatsapp_number" text NOT NULL,
	"leagues_managed_count" integer NOT NULL,
	"tournaments_summary" text NOT NULL,
	"organization_name" text,
	"city_or_region" text,
	"referral_source" text,
	"approximate_players_count" integer,
	"extra_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dashboard_access_granted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dashboard_access_requests" ADD CONSTRAINT "dashboard_access_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dashboard_access_requests_user_id_idx" ON "dashboard_access_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dashboard_access_requests_created_at_idx" ON "dashboard_access_requests" USING btree ("created_at");