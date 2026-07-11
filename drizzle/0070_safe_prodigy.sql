CREATE TABLE `crm_ai_config_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL DEFAULT 1,
	`adminId` int,
	`adminName` varchar(255),
	`action` varchar(100) NOT NULL,
	`field` varchar(100),
	`oldValue` text,
	`newValue` text,
	`details` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `crm_ai_config_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_ai_global_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL DEFAULT 1,
	`aiMode` varchar(20) NOT NULL DEFAULT 'normal',
	`feiraoConfig` text,
	`normalConfig` text,
	`autoReplyEnabled` boolean NOT NULL DEFAULT true,
	`workingHoursEnabled` boolean NOT NULL DEFAULT false,
	`workingHoursStart` int NOT NULL DEFAULT 8,
	`workingHoursEnd` int NOT NULL DEFAULT 20,
	`maxMessagesEnabled` boolean NOT NULL DEFAULT false,
	`maxMessagesPerLead` int NOT NULL DEFAULT 20,
	`personality` varchar(20) NOT NULL DEFAULT 'amigavel',
	`inactiveDispatchEnabled` boolean NOT NULL DEFAULT false,
	`inactiveDispatchHours` int NOT NULL DEFAULT 24,
	`inactiveDispatchMessage` text,
	`inactiveDispatchMaxPerDay` int NOT NULL DEFAULT 1,
	`inactiveDispatchLastRun` bigint,
	`feiraoScheduleStart` bigint,
	`feiraoScheduleEnd` bigint,
	`feiraoAutoSchedule` boolean NOT NULL DEFAULT false,
	`attendantEnabled` boolean NOT NULL DEFAULT false,
	`attendantMode` varchar(20) NOT NULL DEFAULT 'off_hours',
	`attendantPrompt` text,
	`attendantSchedule` text,
	`attendantCollectData` boolean NOT NULL DEFAULT true,
	`attendantAutoSchedule` boolean NOT NULL DEFAULT true,
	`attendantAutoFicha` boolean NOT NULL DEFAULT true,
	`attendantAutoDistribute` boolean NOT NULL DEFAULT true,
	`attendantTankPromo` boolean NOT NULL DEFAULT true,
	`attendantMaxMessages` int NOT NULL DEFAULT 0,
	`updatedAt` bigint,
	CONSTRAINT `crm_ai_global_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_ai_global_config_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `crm_ai_inactive_dispatch_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`tenantId` int NOT NULL DEFAULT 1,
	`sentAt` bigint NOT NULL,
	`message` text,
	CONSTRAINT `crm_ai_inactive_dispatch_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_crm_ai_config_log_tenant` ON `crm_ai_config_log` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_crm_ai_inactive_dispatch_log_tenant` ON `crm_ai_inactive_dispatch_log` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_crm_ai_inactive_dispatch_log_lead` ON `crm_ai_inactive_dispatch_log` (`leadId`);--> statement-breakpoint
-- Backfill: toda loja criada antes desta migration ainda não tem linha de config
-- (só é inserida no provisionamento de tenant novo, server/tenantProvisioning.ts).
-- Sem isso, salvar configuração de IA numa loja existente daria "sucesso" sem
-- persistir nada (UPDATE ... WHERE tenantId = X não acha a linha).
INSERT INTO `crm_ai_global_config` (`tenantId`) SELECT `id` FROM `tenants` WHERE `id` NOT IN (SELECT `tenantId` FROM `crm_ai_global_config`);