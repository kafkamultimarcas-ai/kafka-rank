CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`emailType` varchar(50) NOT NULL,
	`toEmail` varchar(320) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`status` enum('sent','failed') NOT NULL,
	`providerId` varchar(100),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_email_logs_tenant` ON `email_logs` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_email_logs_type` ON `email_logs` (`emailType`);