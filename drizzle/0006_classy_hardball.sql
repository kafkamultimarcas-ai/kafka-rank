CREATE TABLE `consignment_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`competitionId` int,
	`vehiclePlate` varchar(10),
	`vehicleModel` varchar(255),
	`ownerName` varchar(255),
	`entryDate` bigint NOT NULL,
	`validAfterDays` int NOT NULL DEFAULT 7,
	`isValid` boolean NOT NULL DEFAULT false,
	`points` int NOT NULL DEFAULT 1,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consignment_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dispatch_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`competitionId` int,
	`vehiclePlate` varchar(10),
	`documentType` varchar(100),
	`customerPaid` boolean NOT NULL DEFAULT false,
	`transferValue` int DEFAULT 0,
	`points` int NOT NULL DEFAULT 1,
	`bonusPoints` int NOT NULL DEFAULT 0,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dispatch_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fei_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`competitionId` int,
	`customerCpf` varchar(14),
	`vehiclePlate` varchar(10),
	`bankName` varchar(255),
	`financedValue` int DEFAULT 0,
	`returnType` varchar(10),
	`returnValue` int DEFAULT 0,
	`points` int NOT NULL DEFAULT 1,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fei_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `competitions` ADD `category` varchar(50) DEFAULT 'vendas' NOT NULL;--> statement-breakpoint
ALTER TABLE `competitions` ADD `goalTarget` int;--> statement-breakpoint
ALTER TABLE `sellers` ADD `department` varchar(100);