CREATE TABLE `userReviews` (
	`userId` text NOT NULL,
	`mediaId` integer NOT NULL,
	`score` real NOT NULL,
	`comment` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `mediaId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`tmdb_api_key` text,
	`show_media_ratings` integer DEFAULT true NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_settings`("id", "tmdb_api_key", "show_media_ratings", "updatedAt") SELECT "id", "tmdb_api_key", "show_media_ratings", "updatedAt" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `user` ADD `letterboxd_username` text;