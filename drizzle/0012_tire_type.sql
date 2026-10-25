ALTER TABLE `bikes` ADD `tire_type` text DEFAULT 'tubeless' NOT NULL;--> statement-breakpoint
-- Existing bikes: a bike that has (or had) sealant has tubeless tires; any other bike has inner tubes.
UPDATE `bikes` SET `tire_type` = 'tubes' WHERE NOT EXISTS (SELECT 1 FROM `parts` WHERE `parts`.`bike_id` = `bikes`.`id` AND `parts`.`kind` = 'sealant');
