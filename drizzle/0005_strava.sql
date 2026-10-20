CREATE TABLE `strava_connections` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`athlete_id` integer NOT NULL,
	`athlete_name` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`scope` text NOT NULL,
	`gear` text DEFAULT '[]' NOT NULL,
	`synced_at` integer,
	`sync_attempt_at` integer,
	`sync_error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `strava_connections_athlete_id_unique` ON `strava_connections` (`athlete_id`);--> statement-breakpoint
ALTER TABLE `bikes` ADD `strava_distance_km` real;--> statement-breakpoint
ALTER TABLE `bikes` ADD `strava_offset_km` real DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `bikes_strava_gear_unique` ON `bikes` (`strava_gear_id`);