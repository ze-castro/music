CREATE TABLE `listening_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`track_id` text NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`artist_id` text,
	`album_id` text,
	`played_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `history_user_played_idx` ON `listening_history` (`user_id`,`played_at`);--> statement-breakpoint
CREATE INDEX `history_user_artist_idx` ON `listening_history` (`user_id`,`artist`);--> statement-breakpoint
CREATE TABLE `lyrics_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`artist` text NOT NULL,
	`title` text NOT NULL,
	`duration_sec` integer NOT NULL,
	`synced_lyrics` text,
	`plain_lyrics` text,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lyrics_key_idx` ON `lyrics_cache` (`artist`,`title`,`duration_sec`);--> statement-breakpoint
CREATE TABLE `recommendations_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`deezer_id` integer NOT NULL,
	`seed_artist` text NOT NULL,
	`payload` text NOT NULL,
	`generated_at` integer NOT NULL,
	`dismissed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recs_user_kind_deezer_idx` ON `recommendations_cache` (`user_id`,`kind`,`deezer_id`);--> statement-breakpoint
CREATE INDEX `recs_user_generated_idx` ON `recommendations_cache` (`user_id`,`generated_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`server_url` text NOT NULL,
	`username` text NOT NULL,
	`encrypted_secret` text NOT NULL,
	`created_at` integer NOT NULL,
	`home_screen_hint_dismissed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_server_username_idx` ON `users` (`server_url`,`username`);--> statement-breakpoint
CREATE TABLE `wishlist` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`deezer_id` integer NOT NULL,
	`payload` text NOT NULL,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wishlist_user_kind_deezer_idx` ON `wishlist` (`user_id`,`kind`,`deezer_id`);--> statement-breakpoint
CREATE INDEX `wishlist_user_added_idx` ON `wishlist` (`user_id`,`added_at`);