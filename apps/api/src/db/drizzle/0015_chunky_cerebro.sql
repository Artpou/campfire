ALTER TABLE `download` ADD `module_indexer_id` text REFERENCES module(id);--> statement-breakpoint
ALTER TABLE `download` ADD `module_storage_id` text REFERENCES module(id);