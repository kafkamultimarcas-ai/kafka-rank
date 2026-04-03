ALTER TABLE `admins` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `admins` ADD `admin_phone` varchar(20);--> statement-breakpoint
ALTER TABLE `admins` ADD `mustChangePassword` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `admins` ADD `admin_lastAccess` bigint;