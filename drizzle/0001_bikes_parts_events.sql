CREATE TABLE `bikes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`name` text NOT NULL,
	`type` text DEFAULT 'road' NOT NULL,
	`brand` text,
	`model` text,
	`color` text,
	`purchased_at` text,
	`odometer_km` real DEFAULT 0 NOT NULL,
	`strava_gear_id` text,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `part_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`part_id` integer NOT NULL,
	`date` text NOT NULL,
	`odometer_km` real,
	`type` text NOT NULL,
	`description` text,
	`cost` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON UPDATE no action ON DELETE cascade
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
	`interval_km` integer,
	`interval_days` integer,
	`cost` real,
	`status` text DEFAULT 'active' NOT NULL,
	`retired_at` text,
	`retired_km` real,
	`replaced_by_part_id` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`bike_id`) REFERENCES `bikes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `parts_bike_idx` ON `parts` (`bike_id`,`status`);