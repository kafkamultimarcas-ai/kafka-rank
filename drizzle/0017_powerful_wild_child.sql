CREATE TABLE `admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` enum('owner','admin') NOT NULL DEFAULT 'admin',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `crm_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`sellerId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`description` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`filters` text,
	`channel` varchar(50) NOT NULL DEFAULT 'whatsapp',
	`status` enum('draft','scheduled','sending','sent','cancelled') NOT NULL DEFAULT 'draft',
	`scheduledDate` bigint,
	`sentCount` int NOT NULL DEFAULT 0,
	`totalTargets` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`config` text,
	`apiToken` varchar(500),
	`active` boolean NOT NULL DEFAULT true,
	`lastSync` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_integrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brand` varchar(100) NOT NULL,
	`model` varchar(255) NOT NULL,
	`year` varchar(10),
	`plate` varchar(10),
	`color` varchar(50),
	`mileage` int DEFAULT 0,
	`fuelType` varchar(50),
	`transmission` varchar(50),
	`price` int NOT NULL DEFAULT 0,
	`costPrice` int DEFAULT 0,
	`photoUrl` text,
	`photoKey` varchar(500),
	`status` enum('available','reserved','sold','consigned') NOT NULL DEFAULT 'available',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_inventory_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryId` int NOT NULL,
	`leadId` int NOT NULL,
	`sellerId` int NOT NULL,
	`notified` boolean NOT NULL DEFAULT false,
	`dismissed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_inventory_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`department` varchar(50) NOT NULL DEFAULT 'vendas',
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`vehicleInterest` varchar(255),
	`vehiclePlate` varchar(10),
	`source` varchar(100) NOT NULL DEFAULT 'manual',
	`stage` varchar(100) NOT NULL DEFAULT 'novo',
	`score` enum('hot','warm','cold') NOT NULL DEFAULT 'warm',
	`notes` text,
	`nextContactDate` bigint,
	`lastContactDate` bigint,
	`archived` boolean NOT NULL DEFAULT false,
	`convertedToSale` boolean NOT NULL DEFAULT false,
	`saleValue` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_pipeline_stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`department` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`displayOrder` int NOT NULL,
	`color` varchar(20) NOT NULL DEFAULT '#3B82F6',
	`isDefault` boolean NOT NULL DEFAULT false,
	`isFinal` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_pipeline_stages_id` PRIMARY KEY(`id`)
);
