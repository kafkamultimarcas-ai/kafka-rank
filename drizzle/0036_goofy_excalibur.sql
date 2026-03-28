ALTER TABLE `consignment_records` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `fin_transactions` ADD `needsApproval` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `fin_transactions` ADD `approvalStatus` enum('none','pending_approval','approved','rejected') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `fin_transactions` ADD `approvedBy` varchar(255);--> statement-breakpoint
ALTER TABLE `fin_transactions` ADD `approvedAt` bigint;--> statement-breakpoint
ALTER TABLE `fin_transactions` ADD `createdByName` varchar(255);