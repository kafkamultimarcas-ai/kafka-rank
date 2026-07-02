ALTER TABLE `admins` DROP INDEX `admins_username_unique`;--> statement-breakpoint
ALTER TABLE `managers` DROP INDEX `managers_username_unique`;--> statement-breakpoint
ALTER TABLE `admins` ADD CONSTRAINT `admins_tenant_username_idx` UNIQUE(`tenantId`,`username`);--> statement-breakpoint
ALTER TABLE `managers` ADD CONSTRAINT `managers_tenant_username_idx` UNIQUE(`tenantId`,`username`);--> statement-breakpoint
ALTER TABLE `sellers` ADD CONSTRAINT `sellers_tenant_username_idx` UNIQUE(`tenantId`,`username`);