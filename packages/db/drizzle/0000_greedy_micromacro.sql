CREATE TABLE `todo_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`completed` integer DEFAULT false,
	`user_id` text,
	`created_at` text
);
