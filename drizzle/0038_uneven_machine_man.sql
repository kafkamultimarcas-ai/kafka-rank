CREATE TABLE `manager_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`managerId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`severity` varchar(20) NOT NULL DEFAULT 'warning',
	`title` varchar(500) NOT NULL,
	`description` text,
	`targetSellerId` int,
	`relatedEntityId` int,
	`relatedEntityType` varchar(50),
	`dismissed` boolean NOT NULL DEFAULT false,
	`dismissedAt` bigint,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manager_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manager_mentor_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`managerId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`icon` varchar(50),
	`read` boolean NOT NULL DEFAULT false,
	`generatedFor` varchar(20),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manager_mentor_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manager_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`managerId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`priority` varchar(20) NOT NULL DEFAULT 'medium',
	`title` varchar(500) NOT NULL,
	`description` text,
	`targetSellerId` int,
	`actionType` varchar(50),
	`completed` boolean NOT NULL DEFAULT false,
	`completedAt` bigint,
	`expiresAt` bigint,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manager_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `consignment_records` ADD `soldVia` varchar(20);--> statement-breakpoint
ALTER TABLE `consignment_records` ADD `saleId` int;--> statement-breakpoint
ALTER TABLE `consignment_records` ADD `soldAt` bigint;--> statement-breakpoint
ALTER TABLE `sales` ADD `vehiclePlate` varchar(10);