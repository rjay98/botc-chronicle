CREATE TABLE `appearances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`player` text NOT NULL,
	`character` text NOT NULL,
	`alignment` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`played_at` text NOT NULL,
	`game_number` integer DEFAULT 1 NOT NULL,
	`script` text NOT NULL,
	`winner` text NOT NULL,
	`storyteller` text DEFAULT '' NOT NULL,
	`duration_minutes` integer,
	`notes` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL
);
