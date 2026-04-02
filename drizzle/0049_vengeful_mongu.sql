ALTER TABLE `sellers` ADD `leadReceiveBlocked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sellers` ADD `leadBanUntil` bigint;--> statement-breakpoint
ALTER TABLE `sellers` ADD `leadBanReason` varchar(255);