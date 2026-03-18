CREATE TABLE `action_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`dueDate` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `action_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competition_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`sellerId` int NOT NULL,
	`teamId` int,
	`points` int NOT NULL DEFAULT 0,
	`salesCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `competition_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('individual','team','group') NOT NULL DEFAULT 'individual',
	`status` enum('draft','active','finished') NOT NULL DEFAULT 'draft',
	`pointsPerSale` int NOT NULL DEFAULT 1,
	`startDate` bigint NOT NULL,
	`endDate` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `motivational_quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quote` text NOT NULL,
	`author` varchar(255),
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `motivational_quotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`competitionId` int,
	`description` varchar(500),
	`vehicleModel` varchar(255),
	`value` int DEFAULT 0,
	`points` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sellers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`nickname` varchar(100),
	`photoUrl` text,
	`photoKey` varchar(500),
	`phone` varchar(20),
	`email` varchar(320),
	`active` boolean NOT NULL DEFAULT true,
	`totalSales` int NOT NULL DEFAULT 0,
	`totalPoints` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sellers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(20) NOT NULL DEFAULT '#3B82F6',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trainings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trainings_id` PRIMARY KEY(`id`)
);
