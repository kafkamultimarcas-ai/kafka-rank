CREATE TABLE `inventory_vehicle_media` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantId` int NOT NULL DEFAULT 1,
  `inventoryVehicleId` int NOT NULL,
  `mediaType` enum('image','video') NOT NULL,
  `sourceMode` enum('upload','external_url','integration') NOT NULL,
  `storageProvider` enum('s3','external') NOT NULL,
  `url` text NOT NULL,
  `storageKey` varchar(500),
  `fileName` varchar(255),
  `mimeType` varchar(120),
  `fileSizeBytes` bigint,
  `width` int,
  `height` int,
  `durationSeconds` int,
  `sortOrder` int NOT NULL DEFAULT 0,
  `isPrimary` boolean NOT NULL DEFAULT false,
  `status` enum('active','deleted','processing') NOT NULL DEFAULT 'active',
  `createdBySellerId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` bigint,
  CONSTRAINT `inventory_vehicle_media_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_inventory_vehicle_media_tenant` ON `inventory_vehicle_media` (`tenantId`);
CREATE INDEX `idx_inventory_vehicle_media_vehicle` ON `inventory_vehicle_media` (`inventoryVehicleId`);
CREATE INDEX `idx_inventory_vehicle_media_vehicle_status` ON `inventory_vehicle_media` (`inventoryVehicleId`, `status`);
