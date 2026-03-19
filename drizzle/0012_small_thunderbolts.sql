CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('store','individual') NOT NULL,
	`sellerId` int,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`category` varchar(50) NOT NULL DEFAULT 'vendas',
	`targetValue` int NOT NULL,
	`currentValue` int NOT NULL DEFAULT 0,
	`bonusDescription` varchar(500),
	`bonusValue` int DEFAULT 0,
	`achieved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
