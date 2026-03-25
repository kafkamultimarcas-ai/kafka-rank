CREATE TABLE `iam_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dayContext` enum('normal','feirao','movimento_fraco','meta_apertada','fim_de_mes','inicio_de_mes','promocao','lancamento','treinamento') NOT NULL DEFAULT 'normal',
	`dayContextCustom` text,
	`customGreeting` text,
	`extraInstructions` text,
	`alertMessage` text,
	`alertActive` boolean NOT NULL DEFAULT false,
	`weeklyFocus` text,
	`active` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` varchar(255),
	CONSTRAINT `iam_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mkt_strategies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100) DEFAULT 'geral',
	`status` enum('planejada','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'planejada',
	`startDate` bigint,
	`endDate` bigint,
	`budget` int,
	`responsibleId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mkt_strategies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mkt_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`strategyId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pendente','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'pendente',
	`priority` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
	`dueDate` bigint,
	`assignedToId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mkt_tasks_id` PRIMARY KEY(`id`)
);
