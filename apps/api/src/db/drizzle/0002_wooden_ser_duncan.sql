CREATE TABLE `userLikes` (
	`userId` text NOT NULL,
	`mediaId` integer NOT NULL,
	`likedAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `mediaId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `userWatchList` (
	`userId` text NOT NULL,
	`mediaId` integer NOT NULL,
	`addedAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `mediaId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
