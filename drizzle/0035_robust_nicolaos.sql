CREATE TABLE `fuel_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleModel` varchar(255) NOT NULL,
	`vehiclePlate` varchar(20),
	`fuelType` enum('gasolina','etanol','diesel','gnv') NOT NULL DEFAULT 'gasolina',
	`liters` decimal(8,2) NOT NULL,
	`pricePerLiter` decimal(8,3) NOT NULL,
	`totalCost` decimal(10,2) NOT NULL,
	`odometer` int,
	`gasStation` varchar(255),
	`notes` text,
	`receiptUrl` text,
	`receiptKey` varchar(500),
	`fuelDate` bigint NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fuel_records_id` PRIMARY KEY(`id`)
);
