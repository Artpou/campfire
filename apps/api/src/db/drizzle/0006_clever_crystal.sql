PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activityLog` (
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
INSERT INTO `__new_activityLog`("id", "user_id", "type", "action", "title", "metadata", "created_at") SELECT "id", "user_id", "type", "action", "title", "metadata", "created_at" FROM `activityLog`;--> statement-breakpoint
DROP TABLE `activityLog`;--> statement-breakpoint
ALTER TABLE `__new_activityLog` RENAME TO `activityLog`;--> statement-breakpoint
PRAGMA foreign_keys=ON;