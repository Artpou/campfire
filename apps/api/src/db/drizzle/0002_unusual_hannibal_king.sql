CREATE TABLE `indexer` (
	`id` text PRIMARY KEY NOT NULL,
	`indexer_manager_id` text NOT NULL,
	`name` text NOT NULL,
	`label` text NOT NULL,
	`lang` text,
	`privacy` text DEFAULT 'public' NOT NULL,
	`description` text,
	FOREIGN KEY (`indexer_manager_id`) REFERENCES `indexerManager`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_indexerManager` (
	`id` text PRIMARY KEY NOT NULL,
	`indexer_type` text NOT NULL,
	`indexer_url` text,
	`indexer_api_key` text,
	`disabled` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_indexerManager`("id", "indexer_type", "indexer_url", "indexer_api_key") SELECT "id", "indexer_type", "indexer_url", "indexer_api_key" FROM `indexerManager`;--> statement-breakpoint
DROP TABLE `indexerManager`;--> statement-breakpoint
ALTER TABLE `__new_indexerManager` RENAME TO `indexerManager`;--> statement-breakpoint
PRAGMA foreign_keys=ON;