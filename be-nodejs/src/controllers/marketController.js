import { getBinanceService } from '../services/binanceService.js';
import { getBinanceWebSocket } from '../services/binanceWebSocket.js';
import {
  getTopCoins,
  getTrendingCoins,
  getNewListings,
  getMarketOverview,
  getPaginatedMarketList,
  getQuotes,
  getLosers
} from '../services/marketAnalyticsService.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const getSymbols = async (req, res) => {
  try {
    const binanceService = getBinanceService();
    const symbols = await binanceService.getSymbols();
    return successResponse(res, { symbols });
  } catch (error) {
    logger.error('Error in getSymbols:', error);
    return errorResponse(res, { message: 'Failed to fetch symbols' }, 500);
  }
};

export const getTicker = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return errorResponse(res, { message: 'Symbol is required' }, 400);
    }

    const binanceService = getBinanceService();
    const ticker = await binanceService.getTicker24hr(symbol);
    return successResponse(res, { ticker });
  } catch (error) {
    logger.error('Error in getTicker:', error);
    return errorResponse(res, { message: error.message || 'Failed to fetch ticker' }, 500);
  }
};

export const getKlines = async (req, res) => {
  try {
    const { symbol, interval = '1h', limit = 100, startTime, endTime } = req.query;

    if (!symbol) {
      return errorResponse(res, { message: 'Symbol is required' }, 400);
    }

    const binanceService = getBinanceService();
    const klines = await binanceService.getKlines(
      symbol,
      interval,
      parseInt(limit),
      startTime ? parseInt(startTime) : null,
      endTime ? parseInt(endTime) : null
    );

    return successResponse(res, {
      symbol: symbol.toUpperCase(),
      interval,
      klines,
      count: klines.length
    });
  } catch (error) {
    logger.error('Error in getKlines:', error);
    return errorResponse(res, { message: error.message || 'Failed to fetch klines' }, 500);
  }
};

export const getOrderBook = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 20 } = req.query;

    if (!symbol) {
      return errorResponse(res, { message: 'Symbol is required' }, 400);
    }

    const binanceService = getBinanceService();
    const orderBook = await binanceService.getOrderBook(symbol, parseInt(limit));

    return successResponse(res, { orderBook });
  } catch (error) {
    logger.error('Error in getOrderBook:', error);
    return errorResponse(res, { message: error.message || 'Failed to fetch order book' }, 500);
  }
};

export const getRecentTrades = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 50 } = req.query;

    if (!symbol) {
      return errorResponse(res, { message: 'Symbol is required' }, 400);
    }

    const binanceService = getBinanceService();
    const trades = await binanceService.getRecentTrades(symbol, parseInt(limit));

    return successResponse(res, { trades });
  } catch (error) {
    logger.error('Error in getRecentTrades:', error);
    return errorResponse(res, { message: error.message || 'Failed to fetch trades' }, 500);
  }
};

export const getLatestPrice = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return errorResponse(res, { message: 'Symbol is required' }, 400);
    }

    const binanceService = getBinanceService();
    const priceData = await binanceService.getLatestPrice(symbol);
    return successResponse(res, { price: priceData });
  } catch (error) {
    logger.error('Error in getLatestPrice:', error);
    return errorResponse(res, { message: error.message || 'Failed to fetch price' }, 500);
  }
};

export const getWebSocketStatus = async (req, res) => {
  try {
    const binanceWS = getBinanceWebSocket();
    const allPrices = binanceWS.getAllPrices();
    
    return successResponse(res, {
      connected: binanceWS.isConnected,
      subscribedSymbols: Array.from(binanceWS.subscribedSymbols),
      cachedPrices: Object.keys(allPrices).length,
      prices: allPrices
    });
  } catch (error) {
    logger.error('Error in getWebSocketStatus:', error);
    return errorResponse(res, { message: 'Failed to get WebSocket status' }, 500);
  }
};

export const getMarketOverviewStats = async (req, res) => {
  try {
    const overview = await getMarketOverview();
    return successResponse(res, overview);
  } catch (error) {
    logger.error('Error in getMarketOverviewStats:', error);
    return errorResponse(res, { message: 'Failed to fetch market overview' }, 500);
  }
};

export const getMarketTop = async (req, res) => {
  try {
    const {
      limit = 50,
      sortBy = 'volume',
      quote = null
    } = req.query;

    const data = await getTopCoins({
      limit: parseInt(limit),
      sortBy,
      quote
    });

    return successResponse(res, {
      items: data,
      sortBy,
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error in getMarketTop:', error);
    return errorResponse(res, { message: 'Failed to fetch top coins' }, 500);
  }
};

export const getMarketTrending = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const data = await getTrendingCoins({ limit: parseInt(limit) });
    return successResponse(res, {
      items: data,
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error in getMarketTrending:', error);
    return errorResponse(res, { message: 'Failed to fetch trending coins' }, 500);
  }
};

export const getMarketLosers = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const data = await getLosers({ limit: parseInt(limit) });
    return successResponse(res, {
      items: data,
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error in getMarketLosers:', error);
    return errorResponse(res, { message: 'Failed to fetch losing coins' }, 500);
  }
};

export const getMarketNewListings = async (req, res) => {
  try {
    const { days = 7, limit = 50 } = req.query;
    const data = await getNewListings({
      days: parseInt(days),
      limit: parseInt(limit)
    });
    return successResponse(res, {
      items: data,
      days: parseInt(days),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error in getMarketNewListings:', error);
    return errorResponse(res, { message: 'Failed to fetch new listings' }, 500);
  }
};

export const getMarketList = async (req, res) => {
  try {
    const {
      page = 0,
      size = 100,
      sortBy = 'volume',
      quote = null,
      minMarketCap = null,
      maxMarketCap = null,
      minVolume = null,
      maxVolume = null,
      minTradeCount = null,
      maxTradeCount = null
    } = req.query;

    const pageNum = parseInt(page);
    const sizeNum = parseInt(size);

    const { items, total } = await getPaginatedMarketList({
      page: pageNum,
      size: sizeNum,
      sortBy,
      quote,
      minMarketCap,
      maxMarketCap,
      minVolume,
      maxVolume,
      minTradeCount,
      maxTradeCount
    });

    return paginatedResponse(res, items, pageNum, sizeNum, total);
  } catch (error) {
    logger.error('Error in getMarketList:', error);
    return errorResponse(res, { message: 'Failed to fetch market list' }, 500);
  }
};

export const getMarketQuotes = async (req, res) => {
  try {
    const quotes = await getQuotes();
    return successResponse(res, { quotes });
  } catch (error) {
    logger.error('Error in getMarketQuotes:', error);
    return errorResponse(res, { message: 'Failed to fetch quote assets' }, 500);
  }
};

