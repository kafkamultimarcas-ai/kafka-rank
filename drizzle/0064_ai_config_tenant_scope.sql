-- Custom SQL migration file, put your code below! --

-- Estas tabelas (crm_ai_global_config, crm_ai_config_log, crm_ai_inactive_dispatch_log) nunca
-- foram rastreadas pelo Drizzle (acesso sempre via SQL raw). Esta migration é idempotente e
-- tolerante a "tabela não existe" porque o schema real de produção não está disponível aqui.

SET @add_tenant_ai_global_config = IF (
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'crm_ai_global_config')
  AND NOT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'crm_ai_global_config' AND column_name = 'tenantId'
  ),
  'ALTER TABLE `crm_ai_global_config` ADD COLUMN `tenantId` int NOT NULL DEFAULT 1, ADD UNIQUE INDEX `idx_crm_ai_global_config_tenant` (`tenantId`)',
  'SELECT 1'
);--> statement-breakpoint
PREPARE add_tenant_ai_global_config_stmt FROM @add_tenant_ai_global_config;--> statement-breakpoint
EXECUTE add_tenant_ai_global_config_stmt;--> statement-breakpoint
DEALLOCATE PREPARE add_tenant_ai_global_config_stmt;--> statement-breakpoint

SET @add_tenant_ai_config_log = IF (
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'crm_ai_config_log')
  AND NOT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'crm_ai_config_log' AND column_name = 'tenantId'
  ),
  'ALTER TABLE `crm_ai_config_log` ADD COLUMN `tenantId` int NOT NULL DEFAULT 1, ADD INDEX `idx_crm_ai_config_log_tenant` (`tenantId`)',
  'SELECT 1'
);--> statement-breakpoint
PREPARE add_tenant_ai_config_log_stmt FROM @add_tenant_ai_config_log;--> statement-breakpoint
EXECUTE add_tenant_ai_config_log_stmt;--> statement-breakpoint
DEALLOCATE PREPARE add_tenant_ai_config_log_stmt;--> statement-breakpoint

SET @add_tenant_ai_inactive_log = IF (
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'crm_ai_inactive_dispatch_log')
  AND NOT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'crm_ai_inactive_dispatch_log' AND column_name = 'tenantId'
  ),
  'ALTER TABLE `crm_ai_inactive_dispatch_log` ADD COLUMN `tenantId` int NOT NULL DEFAULT 1, ADD INDEX `idx_crm_ai_inactive_dispatch_log_tenant` (`tenantId`)',
  'SELECT 1'
);--> statement-breakpoint
PREPARE add_tenant_ai_inactive_log_stmt FROM @add_tenant_ai_inactive_log;--> statement-breakpoint
EXECUTE add_tenant_ai_inactive_log_stmt;--> statement-breakpoint
DEALLOCATE PREPARE add_tenant_ai_inactive_log_stmt;
