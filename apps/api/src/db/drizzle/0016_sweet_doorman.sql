ALTER TABLE `activityLog` ADD `media_id` integer REFERENCES media(id);--> statement-breakpoint
CREATE INDEX `activityLog_mediaId_idx` ON `activityLog` (`media_id`);--> statement-breakpoint
UPDATE `activityLog` SET `media_id` = CAST(json_extract(`metadata`, '$.mediaId') AS INTEGER) WHERE `media_id` IS NULL AND json_extract(`metadata`, '$.mediaId') IS NOT NULL;