ALTER TABLE `dispatch_records` ADD `documentUrl` text;--> statement-breakpoint
ALTER TABLE `dispatch_records` ADD `documentKey` varchar(500);--> statement-breakpoint
ALTER TABLE `dispatch_records` ADD `transferredAt` bigint;--> statement-breakpoint
ALTER TABLE `dispatch_records` ADD `originalSellerId` int;--> statement-breakpoint
ALTER TABLE `sdr_records` ADD `isFeirão` boolean DEFAULT false NOT NULL;