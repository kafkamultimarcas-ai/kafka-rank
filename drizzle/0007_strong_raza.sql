ALTER TABLE `consignment_records` ADD `exitDate` bigint;--> statement-breakpoint
ALTER TABLE `fei_records` ADD `paymentDate` bigint;--> statement-breakpoint
ALTER TABLE `fei_records` DROP COLUMN `returnValue`;