import pg from 'pg';
const { Pool } = pg;

let pool = null;

/**
 * Parse DB_URL (JDBC format: jdbc:postgresql://host:port/database)
 * or use individual environment variables
 */
const getDatabaseConfig = () => {
  // Helper to ensure password is always a string (required by pg library)
  const getPassword = () => {
    return String(process.env.DB_PASS || process.env.DB_PASSWORD || '');
  };

  // If DB_URL is provided (from be backend), parse it
  if (process.env.DB_URL) {
    // Parse JDBC URL: jdbc:postgresql://host:port/database
    const urlPattern = /^jdbc:postgresql:\/\/([^:]+):(\d+)\/(.+)$/;
    const match = process.env.DB_URL.match(urlPattern);
    
    if (match) {
      return {
        host: match[1],
        port: parseInt(match[2]),
        database: match[3],
        user: process.env.DB_USER || 'postgres',
        password: getPassword(),
      };
    }
    
    // If DB_URL is in standard PostgreSQL format: postgresql://user:pass@host:port/database
    const standardPattern = /^postgresql:\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)\/(.+)$/;
    const standardMatch = process.env.DB_URL.match(standardPattern);
    
    if (standardMatch) {
      return {
        host: standardMatch[3],
        port: parseInt(standardMatch[4]),
        database: standardMatch[5],
        user: standardMatch[1] || process.env.DB_USER || 'postgres',
        password: standardMatch[2] || getPassword(),
      };
    }
  }
  
  // Fallback to individual environment variables (backward compatibility)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'mock_trading',
    user: process.env.DB_USER || 'postgres',
    password: getPassword(),
  };
};

export const initDatabase = async () => {
  if (pool) {
    return pool;
  }

  const config = getDatabaseConfig();

  pool = new Pool({
    ...config,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err);
  });

  // Test connection
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    console.log(`   Database: ${config.database}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    throw err;
  }

  return pool;
};

export const getDatabase = () => {
  if (!pool) {
    return initDatabase();
  }
  return pool;
};

export const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection closed');
  }
};

