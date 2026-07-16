CREATE TABLE `integration_sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL DEFAULT 1,
	`integrationType` varchar(50) NOT NULL,
	`sync_status` enum('success','error') NOT NULL,
	`summary` text,
	`details` text,
	`errorMessage` text,
	`duration` int DEFAULT 0,
	`triggeredBy` varchar(50) DEFAULT 'auto',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integration_sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admins` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `managers` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `sellers` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_transactions` ADD `sellerId` int;--> statement-breakpoint
ALTER TABLE `fin_transactions` ADD `sellerName` varchar(255);--> statement-breakpoint
ALTER TABLE `admins` ADD CONSTRAINT `admins_email_idx` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `managers` ADD CONSTRAINT `managers_email_idx` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `sellers` ADD CONSTRAINT `sellers_email_idx` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `idx_integration_sync_logs_tenant_type` ON `integration_sync_logs` (`tenantId`,`integrationType`);