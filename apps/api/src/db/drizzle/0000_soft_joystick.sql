CREATE TABLE `session` (
	`token` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `torrentDownload` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`mediaId` integer,
	`magnetUri` text NOT NULL,
	`infoHash` text NOT NULL,
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
CREATE UNIQUE INDEX `torrentDownload_infoHash_unique` ON `torrentDownload` (`infoHash`);--> statement-breakpoint
CREATE TABLE `indexerManager` (
	`id` text PRIMARY KEY NOT NULL,
	`indexer_type` text NOT NULL,
	`indexer_url` text NOT NULL,
	`indexer_api_key` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`original_title` text,
	`sanitize_title` text,
	`original_language` text,
	`overview` text,
	`poster_path` text,
	`vote_average` real,
	`release_date` text
);
--> statement-breakpoint
CREATE TABLE `userLikes` (
	`userId` text NOT NULL,
	`mediaId` integer NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `mediaId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `userMedia` (
	`userId` text NOT NULL,
	`mediaId` integer NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `mediaId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `userWatchList` (
	`userId` text NOT NULL,
	`mediaId` integer NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `mediaId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `watchProgress` (
	`userId` text NOT NULL,
	`mediaId` integer NOT NULL,
	`downloadId` text,
	`position` integer DEFAULT 0 NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`updatedAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `mediaId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);