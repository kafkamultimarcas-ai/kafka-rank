CREATE TABLE `pv_orcamento_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orcamentoId` int NOT NULL,
	`tipo` enum('peca','servico','outro') NOT NULL DEFAULT 'peca',
	`descricao` varchar(500) NOT NULL,
	`quantidade` int NOT NULL DEFAULT 1,
	`valorUnitario` decimal(12,2) NOT NULL,
	`valorTotal` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pv_orcamento_itens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pv_orcamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chamadoId` int NOT NULL,
	`titulo` varchar(500) NOT NULL,
	`descricao` text,
	`fotoUrl` text,
	`fotoKey` varchar(500),
	`valorTotal` decimal(12,2) DEFAULT '0',
	`statusAprovacao` enum('pendente','aprovado','reprovado','pago') NOT NULL DEFAULT 'pendente',
	`aprovadoPor` varchar(255),
	`aprovadoEm` bigint,
	`motivoReprovacao` text,
	`criadoPor` varchar(255) NOT NULL,
	`criadoPorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pv_orcamentos_id` PRIMARY KEY(`id`)
);
