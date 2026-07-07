CREATE TABLE `billing_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`severity` enum('critical','warning') NOT NULL,
	`code` varchar(100) NOT NULL,
	`message` text NOT NULL,
	`context` text,
	`resolved` boolean NOT NULL DEFAULT false,
	`resolvedAt` bigint,
	`resolvedBy` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `billing_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_billing_alerts_resolved` ON `billing_alerts` (`resolved`);--> statement-breakpoint
CREATE INDEX `idx_billing_alerts_tenant` ON `billing_alerts` (`tenantId`);