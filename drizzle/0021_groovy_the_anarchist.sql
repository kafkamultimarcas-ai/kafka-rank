CREATE TABLE `pv_chamados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketNumber` varchar(20) NOT NULL,
	`clienteNome` varchar(255) NOT NULL,
	`clienteTelefone` varchar(20),
	`carroModelo` varchar(255) NOT NULL,
	`carroPlaca` varchar(10),
	`problemaRelatado` text NOT NULL,
	`observacoes` text,
	`vendedorId` int NOT NULL,
	`responsavelPvId` int,
	`oficinaId` int,
	`oficinaNome` varchar(255),
	`status` enum('aberto','agendado','em_servico','finalizado','entregue','cancelado') NOT NULL DEFAULT 'aberto',
	`dataEntradaAgendada` bigint,
	`dataEntradaReal` bigint,
	`prazoEntrega` bigint,
	`dataEntregaReal` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pv_chamados_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pv_gastos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chamadoId` int NOT NULL,
	`descricao` varchar(500) NOT NULL,
	`valor` decimal(12,2) NOT NULL,
	`fotoNotaUrl` text,
	`fotoNotaKey` varchar(500),
	`statusAprovacao` enum('pendente','autorizado','recusado','pago') NOT NULL DEFAULT 'pendente',
	`autorizadoPor` varchar(255),
	`autorizadoEm` bigint,
	`pagoEm` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pv_gastos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pv_historico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chamadoId` int NOT NULL,
	`acao` varchar(100) NOT NULL,
	`descricao` text NOT NULL,
	`usuario` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pv_historico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pv_oficinas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`address` varchar(500),
	`notes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pv_oficinas_id` PRIMARY KEY(`id`)
);
