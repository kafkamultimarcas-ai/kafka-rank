CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userType` enum('admin','manager','seller') NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` bigint NOT NULL,
	`usedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_password_reset_tokens_hash` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `managers` ADD `email` varchar(320);--> statement-breakpoint
CREATE INDEX `idx_password_reset_tokens_tenant` ON `password_reset_tokens` (`tenantId`);