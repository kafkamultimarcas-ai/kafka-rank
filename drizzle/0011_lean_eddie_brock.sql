ALTER TABLE `sdr_records` ADD `ticketNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `sdr_records` ADD `customerEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `sdr_records` ADD `attendanceStatus` enum('pending','attended','no_show','approved','rejected') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `sdr_records` ADD `attendanceMarkedAt` bigint;