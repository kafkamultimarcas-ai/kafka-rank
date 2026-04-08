CREATE TABLE `feirao_editions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editionNumber` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`startDate` bigint,
	`endDate` bigint,
	`status` enum('active','finished') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `feirao_editions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `lastMessageAt` bigint;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `lastCampaignId` int;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `isCampaignResponse` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `sdr_records` ADD `feiraoEditionId` int;