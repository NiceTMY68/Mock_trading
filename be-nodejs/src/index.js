import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './config/database.js';
import { initRedis } from './config/redis.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { setupPriceStream } from './websocket/priceStream.js';
import { logger } from './utils/logger.js';
import authRoutes from './routes/auth.js';
import marketRoutes from './routes/market.js';
import newsRoutes from './routes/news.js';
import watchlistRoutes from './routes/watchlists.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import searchRoutes from './routes/search.js';
import userRoutes from './routes/users.js';
import activityRoutes from './routes/activity.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import announcementRoutes from './routes/announcements.js';
import savedSearchRoutes from './routes/savedSearches.js';
import moderationRoutes from './routes/moderation.js';
import bookmarkRoutes from './routes/bookmarks.js';
import hashtagRoutes from './routes/hashtags.js';
import trendingRoutes from './routes/trending.js';
import settingsRoutes from './routes/settings.js';
import uploadRoutes from './routes/uploads.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const server = createServer(app);

let dbInitialized = false;
let redisInitialized = false;

const initializeServices = async () => {
  try {
    await initDatabase();
    dbInitialized = true;
    logger.info('✅ Database initialized');

    const redis = await initRedis();
    redisInitialized = redis !== null;
    if (redisInitialized) {
      logger.info('✅ Redis initialized');
    } else {
      logger.warn('⚠️ Redis not available');
    }
    logger.info('✅ Services initialized');
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true 
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', async (req, res) => {
  const health = { status: 'ok', timestamp: new Date().toISOString(), services: { database: 'connected', redis: 'connected' } };
  try {
    const { getDatabase } = await import('./config/database.js');
    await getDatabase().query('SELECT 1');
  } catch { health.services.database = 'error'; health.status = 'degraded'; }
  try {
    const { getRedis } = await import('./config/redis.js');
    const redis = getRedis();
    if (redis) await redis.ping(); else health.services.redis = 'unavailable';
  } catch { health.services.redis = 'unavailable'; }
  res.status(health.services.database === 'connected' ? 200 : 503).json(health);
});

app.get('/api', apiLimiter, (req, res) => {
  res.json({ message: 'CoinLab API', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/watchlists', watchlistRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/moderation', moderationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/saved-searches', savedSearchRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/hashtags', hashtagRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/uploads', uploadRoutes);

const wss = new WebSocketServer({ server, path: '/ws/prices' });
setupPriceStream(wss, (broadcaster) => {
  if (typeof global !== 'undefined') global.priceBroadcaster = broadcaster;
});

app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

server.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  await initializeServices();
});

