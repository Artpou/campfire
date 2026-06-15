PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_media` (
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
INSERT INTO `__new_media`("id", "imdb_id", "type", "title", "original_title", "sanitize_title", "original_language", "overview", "poster_path", "vote_average", "release_date", "duration", "seasons_number", "backdrop_path", "categories") SELECT "id", "imdb_id", "type", "title", "original_title", "sanitize_title", "original_language", "overview", "poster_path", "vote_average", "release_date", "duration", "seasons_number", "backdrop_path", "categories" FROM `media`;--> statement-breakpoint
DROP TABLE `media`;--> statement-breakpoint
ALTER TABLE `__new_media` RENAME TO `media`;--> statement-breakpoint
PRAGMA foreign_keys=ON;