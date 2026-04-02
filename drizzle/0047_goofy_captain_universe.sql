ALTER TABLE `crm_lead_distribution` ADD `transferThresholdMinutes` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `acknowledgedAt` bigint;