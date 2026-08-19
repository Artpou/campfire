UPDATE `activityLog` SET `type` = 'SUCCESS' WHERE `type` = 'INFO';--> statement-breakpoint
UPDATE `activityLog` SET `action` = 'MEDIA_WATCH' WHERE `action` = 'STREAM_START';--> statement-breakpoint
UPDATE `activityLog` SET `action` = 'ADDON_ENABLE' WHERE `action` = 'INDEXER_ADD';--> statement-breakpoint
UPDATE `activityLog` SET `action` = 'ADDON_DISABLE' WHERE `action` = 'INDEXER_DELETE';--> statement-breakpoint
DELETE FROM `activityLog` WHERE `action` IN ('MEDIA_SEARCH', 'DOWNLOAD_PAUSE', 'DOWNLOAD_RESUME');--> statement-breakpoint
ALTER TABLE `activityLog` DROP COLUMN `title`;
