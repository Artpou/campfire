CREATE TABLE `plexConfig` (
	`id` text PRIMARY KEY NOT NULL,
	`hostname` text,
	`port` integer DEFAULT 32400,
	`token` text,
	`serverName` text,
	`machineIdentifier` text,
	`useSsl` integer DEFAULT false NOT NULL,
	`syncMovies` integer DEFAULT false NOT NULL,
	`syncTv` integer DEFAULT false NOT NULL,
	`syncDownloads` integer DEFAULT false NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_indexerManager` (
	`id` text PRIMARY KEY NOT NULL,
	`indexer_type` text NOT NULL,
	`indexer_url` text NOT NULL,
	`indexer_api_key` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_indexerManager`("id", "indexer_type", "indexer_url", "indexer_api_key") SELECT "id", "indexer_type", "indexer_url", "indexer_api_key" FROM `indexerManager`;--> statement-breakpoint
DROP TABLE `indexerManager`;--> statement-breakpoint
ALTER TABLE `__new_indexerManager` RENAME TO `indexerManager`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `media` ADD `sanitize_title` text;--> statement-breakpoint
ALTER TABLE `userLikes` ADD `createdAt` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `userLikes` DROP COLUMN `likedAt`;--> statement-breakpoint
ALTER TABLE `userMedia` ADD `createdAt` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `userMedia` DROP COLUMN `viewedAt`;--> statement-breakpoint
ALTER TABLE `userWatchList` ADD `createdAt` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `userWatchList` DROP COLUMN `addedAt`;