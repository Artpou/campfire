ALTER TABLE `activityLog` ADD `module_id` text REFERENCES module(id);--> statement-breakpoint
CREATE INDEX `activityLog_moduleId_idx` ON `activityLog` (`module_id`);--> statement-breakpoint
UPDATE `activityLog` SET `module_id` = json_extract(`metadata`, '$.moduleId') WHERE `module_id` IS NULL AND json_extract(`metadata`, '$.moduleId') IS NOT NULL;
