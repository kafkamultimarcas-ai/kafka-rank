CREATE TABLE `consignors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL DEFAULT 1,
	`name` varchar(255) NOT NULL,
	`cpf` varchar(14),
	`phone` varchar(20),
	`email` varchar(255),
	`address` text,
	`notes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consignors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `consignment_records` ADD `consignorId` int;--> statement-breakpoint
ALTER TABLE `consignment_records` ADD `exitReason` varchar(50);--> statement-breakpoint
ALTER TABLE `pv_oficinas` ADD `cep` varchar(10);--> statement-breakpoint
CREATE INDEX `idx_consignors_tenant` ON `consignors` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_consignors_cpf` ON `consignors` (`tenantId`,`cpf`);