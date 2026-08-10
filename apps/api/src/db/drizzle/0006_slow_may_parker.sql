ALTER TABLE `download` ADD `container` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `show_media_ratings` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `show_watch_list` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `show_likes` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `show_watch_history` integer DEFAULT false NOT NULL;