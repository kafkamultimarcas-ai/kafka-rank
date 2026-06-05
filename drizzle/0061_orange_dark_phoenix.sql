CREATE TABLE `commission_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minSales` int NOT NULL,
	`maxSales` int,
	`helpAllowance` int NOT NULL,
	`commissionPerSale` int NOT NULL,
	`bonus` int NOT NULL DEFAULT 0,
	`bonusDescription` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `commission_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seller_advances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`amount` int NOT NULL,
	`description` varchar(500),
	`date` bigint NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `seller_advances_id` PRIMARY KEY(`id`)
);
