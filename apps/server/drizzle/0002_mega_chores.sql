CREATE TABLE `mega_chores` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `title` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `mega_chore_id` text REFERENCES mega_chores(id);--> statement-breakpoint
ALTER TABLE `tasks` ADD `mega_chore_group` integer;--> statement-breakpoint
CREATE INDEX `idx_tasks_mega_chore` ON `tasks` (`mega_chore_id`,`mega_chore_group`);
