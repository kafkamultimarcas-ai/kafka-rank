CREATE TABLE `email_verification_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`code` varchar(6) NOT NULL,
	`purpose` varchar(50) NOT NULL,
	`expiresAt` bigint NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_verification_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `super_admins` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `super_admins` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `super_admins` ADD `twoFactorEnabled` boolean DEFAULT true NOT NULL;