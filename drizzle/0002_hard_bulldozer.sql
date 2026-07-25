CREATE TABLE `characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` text,
	`name` text NOT NULL,
	`character_type` text NOT NULL,
	`edition` text DEFAULT 'custom' NOT NULL,
	`image_url` text NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `characters_source_id_unique` ON `characters` (`source_id`);--> statement-breakpoint
CREATE TABLE `game_storytellers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`storyteller` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `appearances` ADD `role_type` text;--> statement-breakpoint
UPDATE `appearances` SET `role_type` = `character_type`
WHERE `character_type` IN ('townsfolk', 'outsider', 'minion', 'demon');--> statement-breakpoint
ALTER TABLE `games` ADD `winning_alignment` text;--> statement-breakpoint
UPDATE `games` SET `winning_alignment` = `winner`
WHERE `winner` IN ('good', 'evil');
