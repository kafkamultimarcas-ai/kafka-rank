CREATE TABLE `competition_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`competitionName` varchar(255) NOT NULL,
	`competitionType` varchar(20),
	`category` varchar(50),
	`startDate` bigint,
	`endDate` bigint,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`rankingJson` text,
	`championName` varchar(255),
	`championSellerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `competition_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`sellerName` varchar(255) NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`totalSales` int NOT NULL DEFAULT 0,
	`totalPoints` int NOT NULL DEFAULT 0,
	`department` varchar(100),
	`rank` int DEFAULT 0,
	`totalFei` int DEFAULT 0,
	`totalConsignacao` int DEFAULT 0,
	`totalAgendamentos` int DEFAULT 0,
	`totalLeads` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `monthly_snapshots_id` PRIMARY KEY(`id`)
);
