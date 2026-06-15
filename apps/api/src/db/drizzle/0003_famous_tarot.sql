CREATE TABLE `activityLog` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`action` text NOT NULL,
	`title` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `download` ADD `stream_type` text DEFAULT 'TORRENT' NOT NULL;--> statement-breakpoint
ALTER TABLE `download` ADD `indexer_manager_id` text;--> statement-breakpoint
ALTER TABLE `indexerManager` ADD `description` text;--> statement-breakpoint
ALTER TABLE `indexerManager` ADD `logo_url` text;--> statement-breakpoint
ALTER TABLE `indexerManager` ADD `is_addon` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `media` ADD `imdb_id` text;