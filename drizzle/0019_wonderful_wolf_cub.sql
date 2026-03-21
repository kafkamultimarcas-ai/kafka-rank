CREATE TABLE `fin_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('expense','income') NOT NULL,
	`icon` varchar(50) DEFAULT 'receipt',
	`color` varchar(20) DEFAULT '#6b7280',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fin_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('payable','receivable') NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`dueDate` bigint NOT NULL,
	`paidDate` bigint,
	`status` enum('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`categoryId` int,
	`supplier` varchar(255),
	`barcode` varchar(100),
	`notes` text,
	`receiptUrl` text,
	`receiptKey` varchar(500),
	`recurrence` enum('none','monthly','weekly','yearly') DEFAULT 'none',
	`installmentNumber` int,
	`installmentTotal` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fin_transactions_id` PRIMARY KEY(`id`)
);
