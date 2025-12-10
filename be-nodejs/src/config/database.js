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
    const password = process.env.DB_PASS || process.env.DB_PASSWORD;
    // Return empty string if password is undefined/null, otherwise return as string
    return password ? String(password) : '';
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
      const urlPassword = standardMatch[2];
      return {
        host: standardMatch[3],
        port: parseInt(standardMatch[4]),
        database: standardMatch[5],
        user: standardMatch[1] || process.env.DB_USER || 'postgres',
        password: urlPassword ? String(urlPassword) : getPassword(),
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
  
  // Process password: convert to string if exists, or omit if empty
  // pg library with SCRAM doesn't accept empty string for password
  let password = null;
  if (config.password !== undefined && config.password !== null && config.password !== '') {
    password = String(config.password);
  }
  
  // Build pool config - only include password if it has a value
  const poolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
  
  // Only add password field if it has a value (non-empty string)
  if (password !== null && password !== '') {
    poolConfig.password = password;
  }

  // Debug: log config (without showing password value)
  const hasPassword = poolConfig.password !== undefined;
  console.log(`🔍 Database config: host=${poolConfig.host}, port=${poolConfig.port}, db=${poolConfig.database}, user=${poolConfig.user}, has_password=${hasPassword}`);

  pool = new Pool(poolConfig);

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

