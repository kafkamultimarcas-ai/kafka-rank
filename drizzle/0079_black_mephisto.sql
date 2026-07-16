CREATE TABLE `fin_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL DEFAULT 1,
	`person_type` enum('fisica','juridica') NOT NULL DEFAULT 'fisica',
	`name` varchar(255) NOT NULL,
	`cpf_cnpj` varchar(20),
	`rg` varchar(30),
	`nationality` varchar(100),
	`profession` varchar(150),
	`birth_date` bigint,
	`gender` enum('masculino','feminino','outro'),
	`marital_status` enum('solteiro','casado','divorciado','viuvo','outro'),
	`cep` varchar(10),
	`state` varchar(2),
	`city` varchar(150),
	`neighborhood` varchar(150),
	`street` varchar(255),
	`number` varchar(20),
	`complement` varchar(150),
	`email` varchar(320),
	`phone` varchar(20),
	`mobile` varchar(20),
	`notes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fin_suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_fin_suppliers_tenant` ON `fin_suppliers` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_fin_suppliers_name` ON `fin_suppliers` (`tenantId`,`name`);