CREATE TABLE "wishlist" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"deezer_id" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_user_kind_deezer_idx" ON "wishlist" USING btree ("user_id","kind","deezer_id");--> statement-breakpoint
CREATE INDEX "wishlist_user_added_idx" ON "wishlist" USING btree ("user_id","added_at");