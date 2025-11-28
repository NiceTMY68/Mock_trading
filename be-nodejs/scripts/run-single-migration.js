import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase, getDatabase } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node scripts/run-single-migration.js <migration-file>');
  process.exit(1);
}

async function runMigration() {
  try {
    await initDatabase();
    const db = getDatabase();
    
    const filePath = join(__dirname, '..', 'migrations', migrationFile);
    const sql = readFileSync(filePath, 'utf-8');
    
    logger.info(`Running migration: ${migrationFile}`);
    await db.query(sql);
    logger.info(`✅ Migration ${migrationFile} completed`);
    process.exit(0);
  } catch (error) {
    if (error.code === '42P07') {
      logger.info(`⏭ Migration ${migrationFile} already applied (index/table exists)`);
      process.exit(0);
    }
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

