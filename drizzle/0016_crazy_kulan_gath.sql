ALTER TABLE `sellers` ADD `username` varchar(100);--> statement-breakpoint
ALTER TABLE `sellers` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `sellers` ADD `lastAccess` bigint;