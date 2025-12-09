import bcrypt from 'bcryptjs';
import { getDatabase } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
  try {
    const db = getDatabase();
    
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const displayName = process.env.ADMIN_NAME || 'Admin';

    // Check if admin already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      logger.info(`Admin user already exists: ${email}`);
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, email, display_name, role`,
      [email, passwordHash, displayName]
    );

    logger.info('✅ Admin user created successfully:');
    logger.info(`   Email: ${result.rows[0].email}`);
    logger.info(`   Display Name: ${result.rows[0].display_name}`);
    logger.info(`   Role: ${result.rows[0].role}`);
    logger.info(`   Password: ${password} (change this after first login!)`);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }
}

createAdmin();

