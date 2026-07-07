-- Login unificado por email:
-- backfill placeholder para linhas sem email, NOT NULL e UNIQUE global por tabela.

UPDATE `admins` a
  JOIN `tenants` t ON a.`tenantId` = t.`id`
  SET a.`email` = CONCAT('admin', a.`id`, '@', t.`slug`, '.local')
  WHERE a.`email` IS NULL OR a.`email` = '';
--> statement-breakpoint
UPDATE `managers` m
  JOIN `tenants` t ON m.`tenantId` = t.`id`
  SET m.`email` = CONCAT('manager', m.`id`, '@', t.`slug`, '.local')
  WHERE m.`email` IS NULL OR m.`email` = '';
--> statement-breakpoint
UPDATE `sellers` s
  JOIN `tenants` t ON s.`tenantId` = t.`id`
  SET s.`email` = CONCAT('seller', s.`id`, '@', t.`slug`, '.local')
  WHERE s.`email` IS NULL OR s.`email` = '';
--> statement-breakpoint
ALTER TABLE `admins` MODIFY `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `managers` MODIFY `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `sellers` MODIFY `email` varchar(320) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `admins_email_idx` ON `admins` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `managers_email_idx` ON `managers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `sellers_email_idx` ON `sellers` (`email`);
