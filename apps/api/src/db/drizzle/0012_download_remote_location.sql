ALTER TABLE `download` ADD `remote_location` text;--> statement-breakpoint
ALTER TABLE `download` DROP COLUMN `stream_type`;--> statement-breakpoint
ALTER TABLE `download` DROP COLUMN `indexer_manager_id`;--> statement-breakpoint
ALTER TABLE `download` DROP COLUMN `storage_location`;
