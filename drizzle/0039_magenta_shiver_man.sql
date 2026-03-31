CREATE TABLE `bracket_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`round` int NOT NULL,
	`matchOrder` int NOT NULL,
	`teamAId` int,
	`teamBId` int,
	`sellerAId` int,
	`sellerBId` int,
	`scoreA` int NOT NULL DEFAULT 0,
	`scoreB` int NOT NULL DEFAULT 0,
	`winnerId` int,
	`winnerType` varchar(10),
	`bracket_status` enum('pending','active','finished') NOT NULL DEFAULT 'pending',
	`startedAt` bigint,
	`finishedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bracket_matches_id` PRIMARY KEY(`id`)
);
