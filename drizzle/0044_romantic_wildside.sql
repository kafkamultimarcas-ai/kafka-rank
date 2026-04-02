ALTER TABLE `pv_chamados` ADD `tipoVeiculo` enum('loja','consignado') DEFAULT 'loja' NOT NULL;--> statement-breakpoint
ALTER TABLE `pv_orcamentos` ADD `editadoPor` varchar(255);--> statement-breakpoint
ALTER TABLE `pv_orcamentos` ADD `editadoEm` bigint;--> statement-breakpoint
ALTER TABLE `pv_orcamentos` ADD `editMotivo` text;