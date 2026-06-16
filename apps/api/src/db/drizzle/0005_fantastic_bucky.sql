DROP TABLE `indexer`;--> statement-breakpoint
ALTER TABLE `indexerManager` ADD `metadata` text;--> statement-breakpoint
ALTER TABLE `indexerManager` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `indexerManager` DROP COLUMN `logo_url`;--> statement-breakpoint
ALTER TABLE `indexerManager` DROP COLUMN `is_addon`;