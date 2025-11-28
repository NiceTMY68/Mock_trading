import { createClient } from 'redis';

let redisClient = null;
let redisErrorCount = 0;
const MAX_ERROR_LOG = 3; // Only log first 3 errors to avoid spam

export const initRedis = async () => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('❌ Redis: Max reconnection attempts reached. Redis will not be available.');
          return false; // Stop reconnecting
        }
        return Math.min(retries * 100, 3000); // Exponential backoff, max 3s
      },
    },
  });

  redisClient.on('error', (err) => {
    redisErrorCount++;
    if (redisErrorCount <= MAX_ERROR_LOG) {
      console.error(`❌ Redis Client Error (${redisErrorCount}/${MAX_ERROR_LOG}):`, err.message);
      if (redisErrorCount === MAX_ERROR_LOG) {
        console.error('⚠️  Redis: Suppressing further error messages. Redis is not available.');
      }
    }
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected successfully');
    redisErrorCount = 0; // Reset error count on successful connection
  });

  redisClient.on('reconnecting', () => {
    if (redisErrorCount <= MAX_ERROR_LOG) {
      console.log('🔄 Redis: Attempting to reconnect...');
    }
  });

  try {
    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err.message);
    console.warn('⚠️  Application will continue without Redis. Some features may be limited.');
    // Don't throw - allow app to continue without Redis
    return null;
  }
};

export const getRedis = () => {
  if (!redisClient) {
    // Return null instead of throwing - allows graceful degradation
    return null;
  }
  return redisClient;
};

export const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed');
  }
};

