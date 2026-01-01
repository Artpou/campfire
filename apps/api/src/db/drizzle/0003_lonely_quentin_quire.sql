PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_indexerManager` (
	`name` text PRIMARY KEY NOT NULL,
	`apiKey` text,
	`baseUrl` text,
	`selected` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_indexerManager`("name", "apiKey", "baseUrl", "selected") SELECT "name", "apiKey", "baseUrl", "selected" FROM `indexerManager`;--> statement-breakpoint
DROP TABLE `indexerManager`;--> statement-breakpoint
ALTER TABLE `__new_indexerManager` RENAME TO `indexerManager`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'viewer' NOT NULL;