DELETE FROM `sessions`
WHERE NOT EXISTS (
  SELECT 1 FROM `games` WHERE `games`.`session_id` = `sessions`.`id`
);
