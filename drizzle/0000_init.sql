CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bikes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'road' NOT NULL,
	`brake_type` text DEFAULT 'disc' NOT NULL,
	`tire_type` text DEFAULT 'tubeless' NOT NULL,
	`brand` text,
	`model` text,
	`color` text,
	`purchased_at` text,
	`purchase_price` real,
	`odometer_km` real DEFAULT 0 NOT NULL,
	`strava_gear_id` text,
	`strava_distance_km` real,
	`strava_offset_km` real DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bikes_user_idx` ON `bikes` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `bikes_strava_gear_unique` ON `bikes` (`strava_gear_id`);--> statement-breakpoint
CREATE TABLE `part_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`part_id` integer NOT NULL,
	`date` text NOT NULL,
	`odometer_km` real,
	`type` text NOT NULL,
	`description` text,
	`cost` real,
	`resets_interval` integer DEFAULT false NOT NULL,
	`service_round_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_round_id`) REFERENCES `service_rounds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `part_events_part_idx` ON `part_events` (`part_id`,`date`);--> statement-breakpoint
CREATE TABLE `parts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bike_id` integer NOT NULL,
	`category` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`model` text,
	`svg_zone` text,
	`installed_at` text NOT NULL,
	`installed_km` real DEFAULT 0 NOT NULL,
	`service_interval_km` integer,
	`service_interval_days` integer,
	`replace_interval_km` integer,
	`replace_interval_days` integer,
	`cost` real,
	`status` text DEFAULT 'active' NOT NULL,
	`retired_at` text,
	`retired_km` real,
	`replaced_by_part_id` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`bike_id`) REFERENCES `bikes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `parts_bike_idx` ON `parts` (`bike_id`,`status`);--> statement-breakpoint
CREATE TABLE `service_rounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bike_id` integer NOT NULL,
	`date` text NOT NULL,
	`shop` text,
	`odometer_km` real NOT NULL,
	`total_cost` real,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`bike_id`) REFERENCES `bikes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `service_rounds_bike_idx` ON `service_rounds` (`bike_id`,`date`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
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
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`distance_unit` text DEFAULT 'km' NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);