import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrations = [
  '001_create_users.sql',
  '002_create_watchlists.sql',
  '003_create_alerts.sql',
  '004_create_portfolio.sql',
  '005_create_posts.sql',
  '006_create_reports.sql',
  '007_create_notifications.sql',
  '008_create_system_logs.sql',
  '008_update_alerts_table.sql',
  '009_update_notifications_table.sql',
  '010_create_user_follows.sql',
  '011_fix_alerts_active_column.sql',
  '012_add_posts_pinned_featured.sql',
  '013_create_announcements.sql',
  '014_create_failed_login_attempts.sql',
  '015_create_saved_searches.sql'
];

async function runMigrations() {
  try {
    const db = await initDatabase();
    logger.info('Starting database migrations...');

    for (const migration of migrations) {
      const filePath = join(__dirname, '..', 'migrations', migration);
      const sql = readFileSync(filePath, 'utf-8');
      
      logger.info(`Running migration: ${migration}`);
      await db.query(sql);
      logger.info(`✅ Migration ${migration} completed`);
    }

    logger.info('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

