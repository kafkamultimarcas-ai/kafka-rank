ALTER TABLE `inventory_vehicles`
  ADD COLUMN `title` varchar(255),
  ADD COLUMN `internalCode` varchar(100),
  ADD COLUMN `sourceType` varchar(30) NOT NULL DEFAULT 'sync',
  ADD COLUMN `manufactureYear` int,
  ADD COLUMN `modelYear` int,
  ADD COLUMN `chassis` varchar(50),
  ADD COLUMN `renavam` varchar(50),
  ADD COLUMN `purchasePrice` int DEFAULT 0,
  ADD COLUMN `preparationCost` int DEFAULT 0,
  ADD COLUMN `documentationCost` int DEFAULT 0,
  ADD COLUMN `transportCost` int DEFAULT 0,
  ADD COLUMN `otherCosts` int DEFAULT 0,
  ADD COLUMN `minimumSalePrice` int DEFAULT 0,
  ADD COLUMN `highlightItems` text,
  ADD COLUMN `internalTags` text,
  ADD COLUMN `videoUrl` text,
  ADD COLUMN `internalNotes` text,
  ADD COLUMN `storeLocation` varchar(120),
  ADD COLUMN `entryDate` bigint,
  ADD COLUMN `isPublished` boolean NOT NULL DEFAULT true,
  ADD COLUMN `isFeatured` boolean NOT NULL DEFAULT false,
  ADD COLUMN `acceptsTradeIn` boolean NOT NULL DEFAULT false,
  ADD COLUMN `isArmored` boolean NOT NULL DEFAULT false,
  ADD COLUMN `deletedAt` bigint,
  ADD COLUMN `deletedBy` int,
  ADD COLUMN `deletedReason` text;

CREATE TABLE `inventory_audit_logs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `inventoryId` int NOT NULL,
  `action` varchar(40) NOT NULL,
  `actorId` int,
  `actorName` varchar(255),
  `summary` varchar(500) NOT NULL,
  `changedFields` text,
  `metadata` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tenantId` int NOT NULL DEFAULT 1,
  CONSTRAINT `inventory_audit_logs_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_inventory_audit_logs_tenant` ON `inventory_audit_logs` (`tenantId`);
CREATE INDEX `idx_inventory_audit_logs_inventory` ON `inventory_audit_logs` (`inventoryId`);
