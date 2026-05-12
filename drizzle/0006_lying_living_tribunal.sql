CREATE TABLE "league_create_idempotency" (
	"user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"league_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_create_idempotency_user_id_idempotency_key_pk" PRIMARY KEY("user_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "league_create_idempotency" ADD CONSTRAINT "league_create_idempotency_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_create_idempotency" ADD CONSTRAINT "league_create_idempotency_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "league_create_idempotency_league_id_idx" ON "league_create_idempotency" USING btree ("league_id");