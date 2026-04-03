ALTER TABLE `crm_leads` ADD `cpf` varchar(14);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `birthday` varchar(10);--> statement-breakpoint
ALTER TABLE `sales` ADD `customerName` varchar(255);--> statement-breakpoint
ALTER TABLE `sales` ADD `customerEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `sales` ADD `customerCpf` varchar(14);--> statement-breakpoint
ALTER TABLE `sales` ADD `customerBirthday` varchar(10);