ALTER TABLE `storageConfig` ADD `auto_transfer` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `storageConfig` ADD `disk_quota_gb` integer;--> statement-breakpoint
UPDATE `storageConfig` SET `auto_transfer` = `enabled` WHERE `enabled` = 1;--> statement-breakpoint
UPDATE `storageConfig` SET `enabled` = 1 WHERE `host` IS NOT NULL AND `host` != '';
