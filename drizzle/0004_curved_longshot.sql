CREATE TABLE `scripts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scripts_name_unique` ON `scripts` (`name`);
--> statement-breakpoint
UPDATE `games` SET `script` = 'Sects & Violets'
WHERE lower(trim(`script`)) IN ('sects and violets', 'sects & violets');
--> statement-breakpoint
UPDATE `games` SET `script` = 'Troubled Brewing'
WHERE lower(trim(`script`)) IN ('trouble brewing', 'troubled brewing');
--> statement-breakpoint
INSERT OR IGNORE INTO `scripts` (`name`, `created_at`)
SELECT DISTINCT trim(`script`), datetime('now')
FROM `games`
WHERE trim(`script`) <> '';
