-- Accounts get an admin role, and install-wide settings get a table (src/db/app-settings.ts).
-- On an existing install the first account, the one that set BikePro up, becomes the admin.
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `is_admin` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `users` SET `is_admin` = 1 WHERE `id` = (SELECT min(`id`) FROM `users`);
