CREATE TABLE `fin_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL DEFAULT 1,
	`person_type` enum('fisica','juridica') NOT NULL DEFAULT 'fisica',
	`name` varchar(255) NOT NULL,
	`cpf_cnpj` varchar(20),
	`rg` varchar(30),
	`nationality` varchar(100),
	`profession` varchar(150),
	`birth_date` bigint,
	`gender` enum('masculino','feminino','outro'),
	`marital_status` enum('solteiro','casado','divorciado','viuvo','outro'),
	`cep` varchar(10),
	`state` varchar(2),
	`city` varchar(150),
	`neighborhood` varchar(150),
	`street` varchar(255),
	`number` varchar(20),
	`complement` varchar(150),
	`email` varchar(320),
	`phone` varchar(20),
	`mobile` varchar(20),
	`notes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fin_suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `inventory_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryId` int NOT NULL,
	`action` varchar(40) NOT NULL,
	`actorId` int,
	`actorName` varchar(255),
	`summary` varchar(500) NOT NULL,
	`changedFields` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `inventory_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_vehicle_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL DEFAULT 1,
	`inventoryVehicleId` int NOT NULL,
	`mediaType` enum('image','video') NOT NULL,
	`sourceMode` enum('upload','external_url','integration') NOT NULL,
	`storageProvider` enum('s3','external') NOT NULL,
	`url` text NOT NULL,
	`storageKey` varchar(500),
	`fileName` varchar(255),
	`mimeType` varchar(120),
	`fileSizeBytes` bigint,
	`width` int,
	`height` int,
	`durationSeconds` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`status` enum('active','deleted','processing') NOT NULL DEFAULT 'active',
	`createdBySellerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` bigint,
	CONSTRAINT `inventory_vehicle_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admins` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `managers` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `sellers` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `lastMessageContent` varchar(500);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `lastMessageDirection` varchar(10);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `lastMessageType` varchar(20);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `lastMessageSender` varchar(100);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `unreadCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `profilePicUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `socialUsername` varchar(100);--> statement-breakpoint
ALTER TABLE `fin_transactions` ADD `vehicle` varchar(255);--> statement-breakpoint
ALTER TABLE `fin_transactions` ADD `paymentMethod` enum('pix','cartao_credito','boleto','dinheiro');--> statement-breakpoint
ALTER TABLE `fin_transactions` ADD `sellerId` int;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `title` varchar(255);--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `internalCode` varchar(100);--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `sourceType` varchar(30) DEFAULT 'sync' NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `manufactureYear` int;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `modelYear` int;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `chassis` varchar(50);--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `renavam` varchar(50);--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `purchasePrice` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `preparationCost` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `documentationCost` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `transportCost` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `otherCosts` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `minimumSalePrice` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `highlightItems` text;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `internalTags` text;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `videoUrl` text;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `internalNotes` text;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `storeLocation` varchar(120);--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `entryDate` bigint;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `isPublished` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `isFeatured` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `acceptsTradeIn` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `isArmored` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `deletedAt` bigint;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `deletedReason` text;--> statement-breakpoint
ALTER TABLE `seller_advances` ADD `finTransactionId` int;--> statement-breakpoint
ALTER TABLE `admins` ADD CONSTRAINT `admins_email_idx` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `managers` ADD CONSTRAINT `managers_email_idx` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `sellers` ADD CONSTRAINT `sellers_email_idx` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `idx_fin_suppliers_tenant` ON `fin_suppliers` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_fin_suppliers_name` ON `fin_suppliers` (`tenantId`,`name`);--> statement-breakpoint
CREATE INDEX `idx_integration_sync_logs_tenant_type` ON `integration_sync_logs` (`tenantId`,`integrationType`);--> statement-breakpoint
CREATE INDEX `idx_inventory_audit_logs_tenant` ON `inventory_audit_logs` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_inventory_audit_logs_inventory` ON `inventory_audit_logs` (`inventoryId`);--> statement-breakpoint
CREATE INDEX `idx_inventory_vehicle_media_tenant` ON `inventory_vehicle_media` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_inventory_vehicle_media_vehicle` ON `inventory_vehicle_media` (`inventoryVehicleId`);--> statement-breakpoint
CREATE INDEX `idx_inventory_vehicle_media_vehicle_status` ON `inventory_vehicle_media` (`inventoryVehicleId`,`status`);