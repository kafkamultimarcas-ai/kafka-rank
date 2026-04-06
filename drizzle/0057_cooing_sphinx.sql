CREATE TABLE `ai_conversation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`leadName` varchar(255),
	`leadPhone` varchar(20),
	`totalAiMessages` int NOT NULL DEFAULT 0,
	`totalClientMessages` int NOT NULL DEFAULT 0,
	`messageLimit` int NOT NULL DEFAULT 5,
	`stopReason` varchar(50) NOT NULL,
	`leadTemperature` varchar(20),
	`conversationStage` varchar(50),
	`collectedName` boolean NOT NULL DEFAULT false,
	`collectedCpf` boolean NOT NULL DEFAULT false,
	`collectedVehicleInterest` boolean NOT NULL DEFAULT false,
	`collectedTradeIn` boolean NOT NULL DEFAULT false,
	`collectedPaymentMethod` boolean NOT NULL DEFAULT false,
	`collectedCity` boolean NOT NULL DEFAULT false,
	`collectedSchedule` boolean NOT NULL DEFAULT false,
	`totalFieldsCollected` int NOT NULL DEFAULT 0,
	`photosSent` int NOT NULL DEFAULT 0,
	`fichaCreated` boolean NOT NULL DEFAULT false,
	`appointmentCreated` boolean NOT NULL DEFAULT false,
	`distributedToSeller` boolean NOT NULL DEFAULT false,
	`assignedSellerId` int,
	`firstMessageAt` bigint,
	`lastMessageAt` bigint,
	`durationSeconds` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`tenantId` int NOT NULL DEFAULT 1,
	CONSTRAINT `ai_conversation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `aiHandled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `aiDataCollected` text;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `aiCreditAppId` int;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `aiAppointmentId` int;