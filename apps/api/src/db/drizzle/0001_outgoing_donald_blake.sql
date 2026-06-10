PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_torrentDownload` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`mediaId` integer,
	`magnetUri` text NOT NULL,
	`infoHash` text,
	`name` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`savePath` text,
	`origin` text,
	`quality` text,
	`language` text,
	`createdAt` integer NOT NULL,
	`startedAt` integer,
	`completedAt` integer,
	`error` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_torrentDownload`("id", "userId", "mediaId", "magnetUri", "infoHash", "name", "size", "status", "savePath", "origin", "quality", "language", "createdAt", "startedAt", "completedAt", "error") SELECT "id", "userId", "mediaId", "magnetUri", "infoHash", "name", "size", "status", "savePath", "origin", "quality", "language", "createdAt", "startedAt", "completedAt", "error" FROM `torrentDownload`;--> statement-breakpoint
DROP TABLE `torrentDownload`;--> statement-breakpoint
ALTER TABLE `__new_torrentDownload` RENAME TO `torrentDownload`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `torrentDownload_infoHash_unique` ON `torrentDownload` (`infoHash`);