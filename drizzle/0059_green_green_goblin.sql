CREATE TABLE `vehicle_cost_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`category` varchar(100),
	`amount` decimal(12,2) NOT NULL,
	`date` bigint,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `vehicle_cost_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plate` varchar(20) NOT NULL,
	`brand` varchar(100),
	`model` varchar(200),
	`year` int,
	`color` varchar(50),
	`fuel` varchar(50),
	`fipeCode` varchar(30),
	`fipeValue` decimal(12,2),
	`purchasePrice` decimal(12,2),
	`salePrice` decimal(12,2),
	`entryDate` bigint,
	`saleDate` bigint,
	`photoUrl` text,
	`photoKey` varchar(500),
	`vehicleStatus` enum('in_stock','sold','reserved') NOT NULL DEFAULT 'in_stock',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `vehicle_costs_id` PRIMARY KEY(`id`)
);
