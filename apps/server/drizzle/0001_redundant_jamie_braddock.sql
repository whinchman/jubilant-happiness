ALTER TABLE `tasks` ADD `parent_id` text REFERENCES tasks(id);--> statement-breakpoint
CREATE INDEX `idx_tasks_parent` ON `tasks` (`parent_id`,`position`);