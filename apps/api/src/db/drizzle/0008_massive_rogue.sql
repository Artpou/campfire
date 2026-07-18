CREATE TABLE `storageConfig` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`host` text NOT NULL,
	`port` integer DEFAULT 445 NOT NULL,
	`share` text NOT NULL,
	`remote_path` text,
	`username` text,
	`password` text,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `download` ADD `storage_location` text DEFAULT 'LOCAL' NOT NULL;