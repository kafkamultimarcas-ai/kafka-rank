CREATE TABLE `fei_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`feiRecordId` int NOT NULL,
	`editedBy` varchar(255) NOT NULL,
	`editedAt` timestamp NOT NULL DEFAULT (now()),
	`fieldChanged` varchar(100) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`reason` text,
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `fei_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seller_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`module` varchar(50) NOT NULL,
	`canView` boolean NOT NULL DEFAULT false,
	`canEdit` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `seller_permissions_id` PRIMARY KEY(`id`)
);
