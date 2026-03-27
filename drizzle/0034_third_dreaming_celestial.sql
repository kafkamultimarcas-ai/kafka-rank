CREATE TABLE `crm_bulk_send_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message` text NOT NULL,
	`totalRecipients` int NOT NULL,
	`sent` int DEFAULT 0,
	`failed` int DEFAULT 0,
	`errors` text,
	`createdAt` bigint,
	CONSTRAINT `crm_bulk_send_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`phone` varchar(20) NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`messageType` varchar(20) NOT NULL DEFAULT 'text',
	`content` text,
	`mediaUrl` text,
	`senderName` varchar(255),
	`sentBy` int,
	`zapiMessageId` varchar(255),
	`timestamp` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `plate` varchar(10);--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `doors` varchar(5);--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `fipePrice` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `offerPrice` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `vehicleState` varchar(20);--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `category` varchar(50);--> statement-breakpoint
ALTER TABLE `inventory_vehicles` ADD `observation` text;