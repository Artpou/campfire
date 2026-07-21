CREATE TABLE `activityLog` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`action` text NOT NULL,
	`title` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activityLog_userId_idx` ON `activityLog` (`user_id`);--> statement-breakpoint
CREATE INDEX `activityLog_createdAt_idx` ON `activityLog` (`created_at`);--> statement-breakpoint
CREATE TABLE `session` (
	`token` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE INDEX `session_expiresAt_idx` ON `session` (`expiresAt`);--> statement-breakpoint
CREATE TABLE `media_token` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_token_userId_idx` ON `media_token` (`userId`);--> statement-breakpoint
CREATE INDEX `media_token_createdAt_idx` ON `media_token` (`createdAt`);--> statement-breakpoint
CREATE TABLE `download` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`mediaId` integer,
	`origin` text,
	`quality` text,
	`language` text,
	`createdAt` integer NOT NULL,
	`remote_location` text,
	`torrent` text,
	`error` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `download_userId_idx` ON `download` (`userId`);--> statement-breakpoint
CREATE INDEX `download_mediaId_idx` ON `download` (`mediaId`);--> statement-breakpoint
CREATE TABLE `indexerManager` (
	`id` text PRIMARY KEY NOT NULL,
	`indexer_type` text NOT NULL,
	`indexer_url` text,
	`indexer_api_key` text,
	`disabled` integer DEFAULT false NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY NOT NULL,
	`imdb_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`original_title` text,
	`sanitize_title` text,
	`original_language` text,
	`overview` text,
	`poster_path` text,
	`vote_average` real,
	`release_date` text,
	`duration` integer,
	`seasons_number` integer,
	`backdrop_path` text,
	`categories` text
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
CREATE TABLE `storageConfig` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`protocol` text DEFAULT 'ftp' NOT NULL,
	`host` text NOT NULL,
	`port` integer DEFAULT 21 NOT NULL,
	`secure` integer DEFAULT false NOT NULL,
	`movie_path` text,
	`tv_path` text,
	`username` text,
	`password` text,
	`delete_local_after_transfer` integer DEFAULT false NOT NULL,
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
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_single_owner` ON `user` (`role`) WHERE "user"."role" = 'owner';