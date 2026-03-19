ALTER TABLE `notifications` ADD `targetType` varchar(20) DEFAULT 'seller' NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `actionUrl` varchar(500);