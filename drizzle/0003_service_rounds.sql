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
ALTER TABLE `part_events` ADD `service_round_id` integer REFERENCES service_rounds(id) ON DELETE cascade;