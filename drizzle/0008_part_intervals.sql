-- Parts get a service interval and a replacement interval (see src/lib/status.ts).
-- Parts still on the old default interval get both new defaults (src/lib/default-parts.ts);
-- a customised interval is kept as the service interval and gains the default replacement.
ALTER TABLE `parts` RENAME COLUMN `interval_km` TO `service_interval_km`;
--> statement-breakpoint
ALTER TABLE `parts` RENAME COLUMN `interval_days` TO `service_interval_days`;
--> statement-breakpoint
ALTER TABLE `parts` ADD `replace_interval_km` integer;
--> statement-breakpoint
ALTER TABLE `parts` ADD `replace_interval_days` integer;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = 4000, `replace_interval_days` = NULL WHERE `kind` = 'chain' AND NOT (`service_interval_km` IS 3000 AND `service_interval_days` IS 365);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = 400, `service_interval_days` = NULL, `replace_interval_km` = 4000, `replace_interval_days` = NULL WHERE `kind` = 'chain' AND `service_interval_km` IS 3000 AND `service_interval_days` IS 365;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = 12000, `replace_interval_days` = NULL WHERE `kind` = 'cassette' AND NOT (`service_interval_km` IS 9000 AND `service_interval_days` IS NULL);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = 2500, `service_interval_days` = 183, `replace_interval_km` = 12000, `replace_interval_days` = NULL WHERE `kind` = 'cassette' AND `service_interval_km` IS 9000 AND `service_interval_days` IS NULL;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = 20000, `replace_interval_days` = NULL WHERE `kind` = 'chainrings' AND NOT (`service_interval_km` IS 20000 AND `service_interval_days` IS NULL);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = 2500, `service_interval_days` = 183, `replace_interval_km` = 20000, `replace_interval_days` = NULL WHERE `kind` = 'chainrings' AND `service_interval_km` IS 20000 AND `service_interval_days` IS NULL;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = NULL, `replace_interval_days` = NULL WHERE `kind` = 'derailleur_front' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS NULL);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = 5000, `service_interval_days` = 365, `replace_interval_km` = NULL, `replace_interval_days` = NULL WHERE `kind` = 'derailleur_front' AND `service_interval_km` IS NULL AND `service_interval_days` IS NULL;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = NULL, `replace_interval_days` = NULL WHERE `kind` = 'derailleur_rear' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS NULL);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = 3000, `service_interval_days` = 183, `replace_interval_km` = NULL, `replace_interval_days` = NULL WHERE `kind` = 'derailleur_rear' AND `service_interval_km` IS NULL AND `service_interval_days` IS NULL;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = 15000, `replace_interval_days` = NULL WHERE `kind` = 'bottom_bracket' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS 730);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = 5000, `service_interval_days` = 365, `replace_interval_km` = 15000, `replace_interval_days` = NULL WHERE `kind` = 'bottom_bracket' AND `service_interval_km` IS NULL AND `service_interval_days` IS 730;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = NULL, `replace_interval_days` = NULL WHERE `kind` = 'wheel_front' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS 365);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = 5000, `service_interval_days` = 365, `replace_interval_km` = NULL, `replace_interval_days` = NULL WHERE `kind` = 'wheel_front' AND `service_interval_km` IS NULL AND `service_interval_days` IS 365;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = NULL, `replace_interval_days` = NULL WHERE `kind` = 'wheel_rear' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS 365);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = 5000, `service_interval_days` = 365, `replace_interval_km` = NULL, `replace_interval_days` = NULL WHERE `kind` = 'wheel_rear' AND `service_interval_km` IS NULL AND `service_interval_days` IS 365;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = 7000, `replace_interval_days` = 1825 WHERE `kind` = 'tire_front' AND NOT (`service_interval_km` IS 5000 AND `service_interval_days` IS 730);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = NULL, `service_interval_days` = NULL, `replace_interval_km` = 7000, `replace_interval_days` = 1825 WHERE `kind` = 'tire_front' AND `service_interval_km` IS 5000 AND `service_interval_days` IS 730;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = 4000, `replace_interval_days` = 1825 WHERE `kind` = 'tire_rear' AND NOT (`service_interval_km` IS 3500 AND `service_interval_days` IS 730);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = NULL, `service_interval_days` = NULL, `replace_interval_km` = 4000, `replace_interval_days` = 1825 WHERE `kind` = 'tire_rear' AND `service_interval_km` IS 3500 AND `service_interval_days` IS 730;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = NULL, `replace_interval_days` = 183 WHERE `kind` = 'sealant' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS 120);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = NULL, `service_interval_days` = 61, `replace_interval_km` = NULL, `replace_interval_days` = 183 WHERE `kind` = 'sealant' AND `service_interval_km` IS NULL AND `service_interval_days` IS 120;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = 20000, `replace_interval_days` = NULL WHERE `kind` = 'rotors' AND NOT (`service_interval_km` IS 10000 AND `service_interval_days` IS NULL);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = NULL, `service_interval_days` = 183, `replace_interval_km` = 20000, `replace_interval_days` = NULL WHERE `kind` = 'rotors' AND `service_interval_km` IS 10000 AND `service_interval_days` IS NULL;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = NULL, `replace_interval_days` = 365 WHERE `kind` = 'brake_fluid' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS 365);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = NULL, `service_interval_days` = NULL, `replace_interval_km` = NULL, `replace_interval_days` = 365 WHERE `kind` = 'brake_fluid' AND `service_interval_km` IS NULL AND `service_interval_days` IS 365;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = 5000, `replace_interval_days` = 365 WHERE `kind` = 'brake_cables' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS 365);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = NULL, `service_interval_days` = 183, `replace_interval_km` = 5000, `replace_interval_days` = 365 WHERE `kind` = 'brake_cables' AND `service_interval_km` IS NULL AND `service_interval_days` IS 365;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = 5000, `replace_interval_days` = 365 WHERE `kind` = 'cables' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS 365);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = NULL, `service_interval_days` = 183, `replace_interval_km` = 5000, `replace_interval_days` = 365 WHERE `kind` = 'cables' AND `service_interval_km` IS NULL AND `service_interval_days` IS 365;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = NULL, `replace_interval_days` = 365 WHERE `kind` = 'bar_tape' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS 365);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = NULL, `service_interval_days` = NULL, `replace_interval_km` = NULL, `replace_interval_days` = 365 WHERE `kind` = 'bar_tape' AND `service_interval_km` IS NULL AND `service_interval_days` IS 365;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = NULL, `replace_interval_days` = NULL WHERE `kind` = 'saddle' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS NULL);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = NULL, `service_interval_days` = NULL, `replace_interval_km` = NULL, `replace_interval_days` = NULL WHERE `kind` = 'saddle' AND `service_interval_km` IS NULL AND `service_interval_days` IS NULL;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = NULL, `replace_interval_days` = NULL WHERE `kind` = 'pedals' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS NULL);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = 5000, `service_interval_days` = 365, `replace_interval_km` = NULL, `replace_interval_days` = NULL WHERE `kind` = 'pedals' AND `service_interval_km` IS NULL AND `service_interval_days` IS NULL;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = 6000, `replace_interval_days` = 365 WHERE `kind` = 'cleats' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS 180);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = NULL, `service_interval_days` = NULL, `replace_interval_km` = 6000, `replace_interval_days` = 365 WHERE `kind` = 'cleats' AND `service_interval_km` IS NULL AND `service_interval_days` IS 180;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = NULL, `replace_interval_days` = 730 WHERE `kind` = 'headset' AND NOT (`service_interval_km` IS NULL AND `service_interval_days` IS 365);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = 5000, `service_interval_days` = 365, `replace_interval_km` = NULL, `replace_interval_days` = 730 WHERE `kind` = 'headset' AND `service_interval_km` IS NULL AND `service_interval_days` IS 365;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = 2500, `replace_interval_days` = NULL WHERE `kind` IN ('brake_pads_front', 'brake_pads_rear') AND (SELECT `brake_type` FROM `bikes` WHERE `bikes`.`id` = `parts`.`bike_id`) = 'disc' AND NOT (`service_interval_km` IS 2500 AND `service_interval_days` IS NULL);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = 1000, `service_interval_days` = NULL, `replace_interval_km` = 2500, `replace_interval_days` = NULL WHERE `kind` IN ('brake_pads_front', 'brake_pads_rear') AND (SELECT `brake_type` FROM `bikes` WHERE `bikes`.`id` = `parts`.`bike_id`) = 'disc' AND `service_interval_km` IS 2500 AND `service_interval_days` IS NULL;
--> statement-breakpoint
UPDATE `parts` SET `replace_interval_km` = 2000, `replace_interval_days` = NULL WHERE `kind` IN ('brake_pads_front', 'brake_pads_rear') AND (SELECT `brake_type` FROM `bikes` WHERE `bikes`.`id` = `parts`.`bike_id`) = 'rim' AND NOT (`service_interval_km` IS 2000 AND `service_interval_days` IS NULL);
--> statement-breakpoint
UPDATE `parts` SET `service_interval_km` = 1000, `service_interval_days` = NULL, `replace_interval_km` = 2000, `replace_interval_days` = NULL WHERE `kind` IN ('brake_pads_front', 'brake_pads_rear') AND (SELECT `brake_type` FROM `bikes` WHERE `bikes`.`id` = `parts`.`bike_id`) = 'rim' AND `service_interval_km` IS 2000 AND `service_interval_days` IS NULL;
