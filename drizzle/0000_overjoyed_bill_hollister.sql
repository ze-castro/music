CREATE TABLE "listening_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track_id" text NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"artist_id" text,
	"album_id" text,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lyrics_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"artist" text NOT NULL,
	"title" text NOT NULL,
	"duration_sec" integer NOT NULL,
	"synced_lyrics" text,
	"plain_lyrics" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"deezer_id" integer NOT NULL,
	"seed_artist" text NOT NULL,
	"payload" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"server_url" text NOT NULL,
	"username" text NOT NULL,
	"encrypted_secret" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"home_screen_hint_dismissed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations_cache" ADD CONSTRAINT "recommendations_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "history_user_played_idx" ON "listening_history" USING btree ("user_id","played_at");--> statement-breakpoint
CREATE INDEX "history_user_artist_idx" ON "listening_history" USING btree ("user_id","artist");--> statement-breakpoint
CREATE UNIQUE INDEX "lyrics_key_idx" ON "lyrics_cache" USING btree ("artist","title","duration_sec");--> statement-breakpoint
CREATE UNIQUE INDEX "recs_user_kind_deezer_idx" ON "recommendations_cache" USING btree ("user_id","kind","deezer_id");--> statement-breakpoint
CREATE INDEX "recs_user_generated_idx" ON "recommendations_cache" USING btree ("user_id","generated_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_server_username_idx" ON "users" USING btree ("server_url","username");