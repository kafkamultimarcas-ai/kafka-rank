CREATE TABLE `manager_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`module` varchar(50) NOT NULL,
	`canView` boolean NOT NULL DEFAULT true,
	`canEdit` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manager_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sellers` ADD `sellerRole` varchar(20) DEFAULT 'vendedor';