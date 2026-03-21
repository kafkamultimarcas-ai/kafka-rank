CREATE TABLE `crm_follow_up_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`sellerId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`description` text,
	`dueDate` bigint NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`completedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_follow_up_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_lead_distribution` (
	`id` int AUTO_INCREMENT NOT NULL,
	`department` varchar(50) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`lastAssignedSellerId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_lead_distribution_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_lead_distribution_department_unique` UNIQUE(`department`)
);
--> statement-breakpoint
CREATE TABLE `crm_message_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`message` text NOT NULL,
	`department` varchar(50) NOT NULL DEFAULT 'vendas',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_message_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admins` ADD `permissions` text;