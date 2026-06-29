CREATE TABLE `media_token` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_token_userId_idx` ON `media_token` (`userId`);--> statement-breakpoint
CREATE INDEX `media_token_createdAt_idx` ON `media_token` (`createdAt`);--> statement-breakpoint
CREATE INDEX `activityLog_userId_idx` ON `activityLog` (`user_id`);--> statement-breakpoint
CREATE INDEX `activityLog_createdAt_idx` ON `activityLog` (`created_at`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE INDEX `session_expiresAt_idx` ON `session` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `download_userId_idx` ON `download` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_single_owner` ON `user` (`role`) WHERE "user"."role" = 'owner';