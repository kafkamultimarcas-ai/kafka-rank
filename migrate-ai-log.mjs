import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  const conn = await mysql.createConnection(url);
  
  // Create AI config log table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS crm_ai_config_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL DEFAULT 1,
      adminId INT NULL,
      adminName VARCHAR(255) NULL,
      action VARCHAR(100) NOT NULL,
      field VARCHAR(255) NULL,
      oldValue TEXT NULL,
      newValue TEXT NULL,
      details TEXT NULL,
      createdAt BIGINT NOT NULL DEFAULT 0,
      INDEX idx_tenant_created (tenantId, createdAt)
    )
  `);
  console.log('Table crm_ai_config_log created');
  
  // Add feirão schedule columns
  const cols = [
    ['feiraoScheduleStart', 'BIGINT NULL'],
    ['feiraoScheduleEnd', 'BIGINT NULL'],
    ['feiraoAutoSchedule', 'TINYINT NOT NULL DEFAULT 0'],
  ];
  for (const [col, def] of cols) {
    try {
      await conn.execute(`ALTER TABLE crm_ai_global_config ADD COLUMN ${col} ${def}`);
      console.log(`Added ${col}`);
    } catch (e) {
      console.log(`${col}: ${e.message}`);
    }
  }
  
  await conn.end();
  console.log('Migration complete');
}

main().catch(console.error);
