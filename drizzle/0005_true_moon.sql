UPDATE `games` SET `script` = 'Trouble Brewing'
WHERE lower(trim(`script`)) IN ('trouble brewing', 'troubled brewing');
--> statement-breakpoint
UPDATE `games` SET `script` = 'Bad Moon Rising'
WHERE lower(trim(`script`)) IN ('bad moon rising', 'blood moon rising');
--> statement-breakpoint
DELETE FROM `scripts`
WHERE lower(trim(`name`)) IN (
  'trouble brewing',
  'troubled brewing',
  'bad moon rising',
  'blood moon rising'
);
--> statement-breakpoint
INSERT OR IGNORE INTO `scripts` (`name`, `created_at`)
SELECT DISTINCT trim(`script`), datetime('now')
FROM `games`
WHERE trim(`script`) IN ('Trouble Brewing', 'Bad Moon Rising');
