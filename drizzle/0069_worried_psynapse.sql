CREATE TABLE `subscription_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`asaasPaymentId` varchar(100),
	`asaasSubscriptionId` varchar(100),
	`status` varchar(50),
	`value` decimal(12,2),
	`billingType` varchar(30),
	`dueDate` bigint,
	`paymentDate` bigint,
	`rawPayload` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_subscription_events_tenant` ON `subscription_events` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_subscription_events_payment` ON `subscription_events` (`asaasPaymentId`);