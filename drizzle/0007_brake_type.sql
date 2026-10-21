ALTER TABLE `bikes` ADD `brake_type` text DEFAULT 'disc' NOT NULL;--> statement-breakpoint
-- Existing bikes: a bike that has (or had) rotors has disc brakes; any other bike has rim brakes.
UPDATE `bikes` SET `brake_type` = 'rim' WHERE NOT EXISTS (SELECT 1 FROM `parts` WHERE `parts`.`bike_id` = `bikes`.`id` AND `parts`.`kind` = 'rotors');
