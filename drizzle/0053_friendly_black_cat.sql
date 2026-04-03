ALTER TABLE `goals` ADD `deadline` bigint;--> statement-breakpoint
ALTER TABLE `goals` ADD `reminderSentAt` bigint;--> statement-breakpoint
ALTER TABLE `goals` ADD `reminderCount` int DEFAULT 0 NOT NULL;