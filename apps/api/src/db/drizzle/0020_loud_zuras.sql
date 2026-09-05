PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `watchProgress_downloadId_idx` ON `watchProgress` (`downloadId`);--> statement-breakpoint
CREATE INDEX `activityLog_action_idx` ON `activityLog` (`action`);--> statement-breakpoint
CREATE INDEX `activityLog_type_idx` ON `activityLog` (`type`);--> statement-breakpoint
CREATE INDEX `mediaRequest_userId_idx` ON `mediaRequest` (`userId`);