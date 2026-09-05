CREATE INDEX `session_previous_token_idx` ON `session` (`previous_token`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_download` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`mediaId` integer,
	`origin` text,
	`quality` text,
	`language` text,
	`container` text,
	`createdAt` integer NOT NULL,
	`size` integer,
	`remote_location` text,
	`module_indexer_id` text,
	`module_storage_id` text,
	`torrent` text,
	`error` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`module_indexer_id`) REFERENCES `module`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`module_storage_id`) REFERENCES `module`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_download`("id", "userId", "mediaId", "origin", "quality", "language", "container", "createdAt", "size", "remote_location", "module_indexer_id", "module_storage_id", "torrent", "error") SELECT "id", "userId", "mediaId", "origin", "quality", "language", "container", "createdAt", "size", "remote_location", "module_indexer_id", "module_storage_id", "torrent", "error" FROM `download`;--> statement-breakpoint
DROP TABLE `download`;--> statement-breakpoint
ALTER TABLE `__new_download` RENAME TO `download`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `download_userId_idx` ON `download` (`userId`);--> statement-breakpoint
CREATE INDEX `download_mediaId_idx` ON `download` (`mediaId`);--> statement-breakpoint
CREATE INDEX `download_module_storage_id_idx` ON `download` (`module_storage_id`);--> statement-breakpoint
CREATE TABLE `__new_watchProgress` (
	`userId` text NOT NULL,
	`mediaId` integer NOT NULL,
	`downloadId` text,
	`position` integer DEFAULT 0 NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`updatedAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `mediaId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`downloadId`) REFERENCES `download`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_watchProgress`("userId", "mediaId", "downloadId", "position", "duration", "completed", "updatedAt") SELECT "userId", "mediaId", "downloadId", "position", "duration", "completed", "updatedAt" FROM `watchProgress`;--> statement-breakpoint
DROP TABLE `watchProgress`;--> statement-breakpoint
ALTER TABLE `__new_watchProgress` RENAME TO `watchProgress`;--> statement-breakpoint
CREATE INDEX `watchProgress_downloadId_idx` ON `watchProgress` (`downloadId`);--> statement-breakpoint
CREATE INDEX `module_type_idx` ON `module` (`type`);--> statement-breakpoint
CREATE INDEX `mediaRequest_status_idx` ON `mediaRequest` (`status`);