CREATE TABLE `mediaRequest` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`mediaId` integer NOT NULL,
	`dismissed` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mediaRequest_user_media_unique` ON `mediaRequest` (`userId`,`mediaId`);