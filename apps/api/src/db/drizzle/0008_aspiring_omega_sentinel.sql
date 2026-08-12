ALTER TABLE `session` ADD `previous_token` text;--> statement-breakpoint
ALTER TABLE `mediaRequest` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `show_watch_list`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `show_likes`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `show_watch_history`;