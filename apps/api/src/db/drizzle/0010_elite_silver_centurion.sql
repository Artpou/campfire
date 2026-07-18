PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_storageConfig` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`protocol` text DEFAULT 'ftp' NOT NULL,
	`host` text NOT NULL,
	`port` integer DEFAULT 21 NOT NULL,
	`secure` integer DEFAULT false NOT NULL,
	`share` text,
	`remote_path` text,
	`username` text,
	`password` text,
	`delete_local_after_transfer` integer DEFAULT false NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_storageConfig`("id", "enabled", "protocol", "host", "port", "secure", "share", "remote_path", "username", "password", "delete_local_after_transfer", "updatedAt") SELECT "id", "enabled", 'ftp', "host", "port", false, "share", "remote_path", "username", "password", "delete_local_after_transfer", "updatedAt" FROM `storageConfig`;--> statement-breakpoint
DROP TABLE `storageConfig`;--> statement-breakpoint
ALTER TABLE `__new_storageConfig` RENAME TO `storageConfig`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
