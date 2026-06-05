CREATE TABLE `bonus_vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleModel` varchar(255) NOT NULL,
	`plate` varchar(20),
	`bonusAmount` int NOT NULL,
	`campaignName` varchar(255) NOT NULL,
	`campaignRules` text,
	`startDate` bigint NOT NULL,
	`endDate` bigint NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `bonus_vehicles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seller_bonuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`saleId` int,
	`bonusVehicleId` int,
	`type` varchar(50) NOT NULL,
	`amount` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`campaignName` varchar(255),
	`status` varchar(30) NOT NULL DEFAULT 'pending',
	`month` int NOT NULL,
	`year` int NOT NULL,
	`approvedBy` int,
	`approvedAt` bigint,
	`paidAt` bigint,
	`rejectionReason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `seller_bonuses_id` PRIMARY KEY(`id`)
);
