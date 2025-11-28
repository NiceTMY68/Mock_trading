import express from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';
import * as marketController from '../controllers/marketController.js';

const router = express.Router();

// GET /api/market/symbols - Get all trading symbols
router.get('/symbols', apiLimiter, marketController.getSymbols);

// GET /api/market/ticker/:symbol - Get 24hr ticker for a symbol
router.get('/ticker/:symbol', apiLimiter, marketController.getTicker);

// GET /api/market/klines - Get candlestick data
router.get('/klines', apiLimiter, marketController.getKlines);

// GET /api/market/price/:symbol - Get latest price (from WebSocket cache or API)
router.get('/price/:symbol', apiLimiter, marketController.getLatestPrice);

// GET /api/market/orderbook/:symbol - Get order book
router.get('/orderbook/:symbol', apiLimiter, marketController.getOrderBook);

// GET /api/market/trades/:symbol - Get recent trades
router.get('/trades/:symbol', apiLimiter, marketController.getRecentTrades);

// GET /api/market/ws/status - Get WebSocket connection status
router.get('/ws/status', apiLimiter, marketController.getWebSocketStatus);

// GET /api/market/overview - Market overview stats
router.get('/overview', apiLimiter, marketController.getMarketOverviewStats);

// GET /api/market/top - Top coins by sort criteria
router.get('/top', apiLimiter, marketController.getMarketTop);

// GET /api/market/trending - Trending coins
router.get('/trending', apiLimiter, marketController.getMarketTrending);

// GET /api/market/losers - Biggest losers
router.get('/losers', apiLimiter, marketController.getMarketLosers);

// GET /api/market/new - New listings
router.get('/new', apiLimiter, marketController.getMarketNewListings);

// GET /api/market/list - Paginated market list
router.get('/list', apiLimiter, marketController.getMarketList);

// GET /api/market/quotes - Available quote assets
router.get('/quotes', apiLimiter, marketController.getMarketQuotes);

export default router;

