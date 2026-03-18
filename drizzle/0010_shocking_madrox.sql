CREATE TABLE `sdr_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`competitionId` int,
	`type` enum('agendamento','lead_convertido') NOT NULL,
	`customerName` varchar(255),
	`customerPhone` varchar(20),
	`vehicleInterest` varchar(255),
	`source` varchar(100),
	`scheduledDate` bigint,
	`converted` boolean NOT NULL DEFAULT false,
	`notes` text,
	`points` int NOT NULL DEFAULT 1,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sdr_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sellers` MODIFY COLUMN `department` varchar(100) DEFAULT 'vendas';