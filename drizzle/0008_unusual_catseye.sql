CREATE TABLE "league_category_create_idempotency" (
	"user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"league_category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_category_create_idempotency_user_id_idempotency_key_pk" PRIMARY KEY("user_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "league_category_create_idempotency" ADD CONSTRAINT "league_category_create_idempotency_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_category_create_idempotency" ADD CONSTRAINT "league_category_create_idempotency_league_category_id_league_categories_id_fk" FOREIGN KEY ("league_category_id") REFERENCES "public"."league_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "league_category_create_idempotency_category_id_idx" ON "league_category_create_idempotency" USING btree ("league_category_id");