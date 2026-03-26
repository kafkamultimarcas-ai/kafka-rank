ALTER TABLE `consignment_records` ADD `hasAuction` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `consignment_records` ADD `vehicleStatus` varchar(20) DEFAULT 'quitado';--> statement-breakpoint
ALTER TABLE `consignment_records` ADD `payoffValue` int;--> statement-breakpoint
ALTER TABLE `consignment_records` ADD `notes` text;