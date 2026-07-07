CREATE TABLE `ai_appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`sellerId` int,
	`customerName` varchar(255),
	`customerPhone` varchar(20),
	`scheduledDate` bigint NOT NULL,
	`scheduledTime` varchar(10),
	`vehicleInterest` varchar(255),
	`purpose` varchar(50) NOT NULL DEFAULT 'visita',
	`status` enum('pending','confirmed','attended','no_show','cancelled') NOT NULL DEFAULT 'pending',
	`aiCreated` boolean DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `ai_appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`sellerId` int,
	`customerName` varchar(255),
	`customerCpf` varchar(14),
	`customerRg` varchar(20),
	`customerBirthDate` varchar(10),
	`customerPhone` varchar(20),
	`customerEmail` varchar(320),
	`customerAddress` text,
	`customerIncome` int DEFAULT 0,
	`customerEmployer` varchar(255),
	`customerEmploymentTime` varchar(100),
	`vehicleInterest` varchar(255),
	`downPayment` int DEFAULT 0,
	`tradeInVehicle` varchar(255),
	`tradeInPlate` varchar(10),
	`tradeInKm` int DEFAULT 0,
	`tradeInValue` int DEFAULT 0,
	`financingTerm` int DEFAULT 48,
	`financingValue` int DEFAULT 0,
	`status` enum('pending','analyzing','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`feiNotes` text,
	`bankPreference` varchar(100),
	`feiAnalyzedAt` bigint,
	`aiCollected` boolean DEFAULT false,
	`aiCollectedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` bigint,
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `credit_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_ai_appointments_tenant` ON `ai_appointments` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_ai_appointments_lead` ON `ai_appointments` (`leadId`);--> statement-breakpoint
CREATE INDEX `idx_credit_applications_tenant` ON `credit_applications` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_credit_applications_lead` ON `credit_applications` (`leadId`);