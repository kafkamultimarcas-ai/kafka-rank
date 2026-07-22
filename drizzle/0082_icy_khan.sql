CREATE TABLE `consignment_crm_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL DEFAULT 1,
	`consignment_id` int NOT NULL,
	`from_status` varchar(50),
	`to_status` varchar(50) NOT NULL,
	`changed_by_id` int,
	`changed_by_name` varchar(100),
	`changed_at` bigint NOT NULL,
	CONSTRAINT `consignment_crm_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_crm_history_consignment` ON `consignment_crm_history` (`consignment_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_history_tenant` ON `consignment_crm_history` (`tenantId`);