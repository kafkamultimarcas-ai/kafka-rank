import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  const conn = await mysql.createConnection(url);

  // Create campaigns table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS crm_campaigns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL DEFAULT 1,
      name VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      mediaUrl TEXT NULL,
      mediaType VARCHAR(50) NULL,
      mediaFileName VARCHAR(255) NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'draft',
      filterType VARCHAR(50) NOT NULL DEFAULT 'all',
      filterConfig TEXT NULL,
      antiBanIntervalSec INT NOT NULL DEFAULT 45,
      antiBanMaxPerDay INT NOT NULL DEFAULT 80,
      antiBanStartHour INT NOT NULL DEFAULT 8,
      antiBanEndHour INT NOT NULL DEFAULT 20,
      totalRecipients INT NOT NULL DEFAULT 0,
      totalSent INT NOT NULL DEFAULT 0,
      totalDelivered INT NOT NULL DEFAULT 0,
      totalResponded INT NOT NULL DEFAULT 0,
      totalFailed INT NOT NULL DEFAULT 0,
      createdBy INT NULL,
      createdByName VARCHAR(255) NULL,
      startedAt BIGINT NULL,
      completedAt BIGINT NULL,
      createdAt BIGINT NOT NULL DEFAULT 0,
      updatedAt BIGINT NOT NULL DEFAULT 0,
      INDEX idx_tenant_status (tenantId, status),
      INDEX idx_created (createdAt)
    )
  `);
  console.log('Table crm_campaigns created');

  // Create campaign recipients table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS crm_campaign_recipients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campaignId INT NOT NULL,
      leadId INT NULL,
      phone VARCHAR(50) NOT NULL,
      name VARCHAR(255) NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      sentAt BIGINT NULL,
      deliveredAt BIGINT NULL,
      respondedAt BIGINT NULL,
      responseMessage TEXT NULL,
      errorMessage TEXT NULL,
      zapiMessageId VARCHAR(255) NULL,
      INDEX idx_campaign (campaignId),
      INDEX idx_campaign_status (campaignId, status),
      INDEX idx_phone (phone),
      INDEX idx_responded (respondedAt)
    )
  `);
  console.log('Table crm_campaign_recipients created');

  // Add campaignId to crm_leads for tracking campaign responses
  try {
    await conn.execute('ALTER TABLE crm_leads ADD COLUMN lastCampaignId INT NULL');
    console.log('Added lastCampaignId to crm_leads');
  } catch (e) {
    console.log('lastCampaignId:', e.message);
  }

  try {
    await conn.execute('ALTER TABLE crm_leads ADD COLUMN isCampaignResponse TINYINT NOT NULL DEFAULT 0');
    console.log('Added isCampaignResponse to crm_leads');
  } catch (e) {
    console.log('isCampaignResponse:', e.message);
  }

  await conn.end();
  console.log('Migration complete');
}

main().catch(console.error);
