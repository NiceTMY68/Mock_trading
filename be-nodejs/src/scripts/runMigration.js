/**
 * Run a specific migration
 * 
 * Usage: node src/scripts/runMigration.js <migration_name>
 * Example: node src/scripts/runMigration.js 009_content_moderation
 */

import dotenv from 'dotenv';
dotenv.config();

import { initDatabase, getDatabase } from '../config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(migrationName) {
  try {
    console.log('🔄 Initializing database connection...');
    await initDatabase();
    const db = getDatabase();
    
    console.log(`📦 Loading migration: ${migrationName}...`);
    const migrationPath = path.join(__dirname, '..', 'migrations', `${migrationName}.js`);
    const migration = await import(`file://${migrationPath}`);
    
    console.log('🚀 Running migration UP...');
    await migration.up(db);
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

const migrationName = process.argv[2];
if (!migrationName) {
  console.error('❌ Please provide migration name as argument');
  console.log('Usage: node src/scripts/runMigration.js <migration_name>');
  process.exit(1);
}

runMigration(migrationName);

