ALTER TABLE `user` ADD `onboarded` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `user` SET `onboarded` = 1;
