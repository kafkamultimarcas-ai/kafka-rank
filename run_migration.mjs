import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const sql = fs.readFileSync('drizzle/0054_nappy_ben_urich.sql', 'utf8');
const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

const conn = await mysql.createConnection(process.env.DATABASE_URL);

for (const stmt of statements) {
  try {
    console.log('Executing:', stmt.substring(0, 80));
    await conn.execute(stmt);
    console.log('OK');
  } catch(e) {
    console.log('Skipped (already exists):', e.message.substring(0, 80));
  }
}

await conn.end();
console.log('Migration complete!');
