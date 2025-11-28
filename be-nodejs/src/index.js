import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { initDatabase } from './config/database.js';
import { initRedis } from './config/redis.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { initBinanceWebSocket } from './services/binanceWebSocket.js';
import { setupPriceStream } from './websocket/priceStream.js';
import { logger } from './utils/logger.js';

// Import routes
import authRoutes from './routes/auth.js';
import marketRoutes from './routes/market.js';
import newsRoutes from './routes/news.js';
import blogRoutes from './routes/blogs.js';
import watchlistRoutes from './routes/watchlists.js';
import portfolioRoutes from './routes/portfolio.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import alertRoutes from './routes/alerts.js';
import notificationRoutes from './routes/notifications.js';
import searchRoutes from './routes/search.js';
import userRoutes from './routes/users.js';
import activityRoutes from './routes/activity.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import announcementRoutes from './routes/announcements.js';
import savedSearchRoutes from './routes/savedSearches.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server for WebSocket
const server = createServer(app);

// Initialize services
let dbInitialized = false;
let redisInitialized = false;

const initializeServices = async () => {
  try {
    // Initialize database
    await initDatabase();
    dbInitialized = true;
    logger.info('✅ Database initialized');

    // Initialize Redis
    const redis = await initRedis();
    redisInitialized = redis !== null;
    if (redisInitialized) {
    logger.info('✅ Redis initialized');
    } else {
      logger.warn('⚠️  Redis not available - application will continue without caching');
    }

    // Initialize Binance WebSocket (will connect automatically)
    const defaultSymbols = ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'adausdt'];
    const binanceWS = await initBinanceWebSocket(defaultSymbols);
    
    // Setup price update callback - ensure broadcaster is available
    // Wait a bit for priceBroadcaster to be set by setupPriceStream callback
    await new Promise(resolve => setTimeout(resolve, 100));
    
    binanceWS.onPriceUpdate = (priceData) => {
      // Use global broadcaster (set by setupPriceStream)
      const broadcaster = (typeof global !== 'undefined' && global.priceBroadcaster) 
        ? global.priceBroadcaster 
        : priceBroadcaster;
      
      if (broadcaster) {
        broadcaster(priceData);
        logger.debug(`Price update for ${priceData.symbol} forwarded to broadcaster`);
      } else {
        logger.warn('Price broadcaster not available, price update lost');
      }
    };
    
    logger.info('✅ Binance WebSocket price update callback configured');

    logger.info('✅ Services initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (for performance monitoring)
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const logLevel = duration > 1000 ? 'warn' : duration > 500 ? 'info' : 'debug';
    
    logger[logLevel](`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 50)
    });
    
    return originalSend.call(this, data);
  };
  
  next();
});

app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'crypto-community-backend',
    services: {
      database: dbInitialized ? 'connected' : 'disconnected',
      redis: redisInitialized ? 'connected' : 'disconnected'
    }
  };

  try {
    const { getDatabase } = await import('./config/database.js');
    const db = getDatabase();
    await db.query('SELECT 1');
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'error';
    health.status = 'degraded';
  }

  try {
    const { getRedis } = await import('./config/redis.js');
    const redis = getRedis();
    if (redis) {
    await redis.ping();
    health.services.redis = 'connected';
    } else {
      health.services.redis = 'unavailable';
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.redis = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/api', apiLimiter, (req, res) => {
  res.json({ 
    message: 'Crypto Community Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      market: '/api/market',
      news: '/api/news',
      blogs: '/api/blogs'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/watchlists', watchlistRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/saved-searches', savedSearchRoutes);

// WebSocket server for price streaming
const wss = new WebSocketServer({ 
  server,
  path: '/ws/prices'
});

// Setup price streaming with broadcaster callback
let priceBroadcaster = null;
const { broadcastPriceUpdate } = setupPriceStream(wss, (broadcaster) => {
  priceBroadcaster = broadcaster;
  // Export broadcaster for Binance WebSocket to use
  if (typeof global !== 'undefined') {
    global.priceBroadcaster = broadcaster;
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
server.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 WebSocket server ready at ws://localhost:${PORT}/ws/prices`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize services after server starts
  await initializeServices();
});

