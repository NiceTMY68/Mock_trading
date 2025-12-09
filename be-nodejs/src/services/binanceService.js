import axios from 'axios';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

class BinanceService {
  constructor() {
    // Use data-api.binance.vision for public market data (recommended by Binance)
    // Fallback to api.binance.com if needed
    this.baseUrl = 'https://data-api.binance.vision/api/v3';
    this.fallbackUrls = [
      'https://api1.binance.com/api/v3',
      'https://api2.binance.com/api/v3',
      'https://api.binance.com/api/v3'
    ];
    this.currentFallbackIndex = -1;
    this.cacheTTL = {
      symbols: 3600, // 1 hour
      ticker: 30, // 30 seconds
      klines: 300, // 5 minutes
      price: 5 // 5 seconds
    };
  }

  /**
   * Get current base URL, with fallback support
   */
  getBaseUrl() {
    if (this.currentFallbackIndex < 0) {
      return this.baseUrl;
    }
    return this.fallbackUrls[this.currentFallbackIndex] || this.baseUrl;
  }

  /**
   * Switch to next fallback URL
   */
  switchToFallback() {
    this.currentFallbackIndex++;
    if (this.currentFallbackIndex >= this.fallbackUrls.length) {
      this.currentFallbackIndex = -1; // Reset to main URL
    }
    logger.info(`Switched to Binance API: ${this.getBaseUrl()}`);
  }

  /**
   * Get cached value from Redis
   */
  async getCachedValue(key) {
    try {
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(key);
        return cached;
      }
    } catch (error) {
      logger.warn(`Cache get error for ${key}:`, error.message);
    }
    return null;
  }

  /**
   * Set cached value in Redis
   */
  async setCachedValue(key, ttlSeconds, value) {
    try {
      const redis = getRedis();
      if (redis) {
        await redis.setEx(key, ttlSeconds, JSON.stringify(value));
      }
    } catch (error) {
      logger.warn(`Cache set error for ${key}:`, error.message);
    }
  }

  /**
   * Make API request with automatic fallback on failure
   */
  async makeRequest(endpoint, params = {}, timeout = 15000) {
    const maxRetries = this.fallbackUrls.length + 1;
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const url = `${this.getBaseUrl()}${endpoint}`;
        const response = await axios.get(url, { params, timeout });
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || !error.response) {
          logger.warn(`Binance API timeout/error on ${this.getBaseUrl()}, switching to fallback...`);
          this.switchToFallback();
        } else {
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Get all trading symbols
   */
  async getSymbols() {
    const cacheKey = 'binance:symbols';
    
    const cached = await this.getCachedValue(cacheKey);
    if (cached) {
      logger.debug('Returning cached symbols');
      return JSON.parse(cached);
    }

    try {
      logger.info('Fetching symbols from Binance');
      const data = await this.makeRequest('/exchangeInfo');

      const symbols = data.symbols
        .filter(s => s.status === 'TRADING')
        .map(s => ({
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset,
          status: s.status,
          listDate: s.onboardDate || null
        }));

      await this.setCachedValue(cacheKey, this.cacheTTL.symbols, symbols);

      return symbols;
    } catch (error) {
      logger.error('Error fetching symbols:', error.message);
      throw error;
    }
  }

  /**
   * Get symbol map for quick lookup
   */
  async getSymbolMap() {
    const symbols = await this.getSymbols();
    const map = {};
    symbols.forEach(s => {
      map[s.symbol] = {
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        status: s.status,
        listDate: s.listDate
      };
    });
    return map;
  }

  /**
   * Get 24h ticker statistics for a symbol
   */
  async getTicker24hr(symbol) {
    const normalizedSymbol = symbol.toUpperCase();
    const cacheKey = `binance:ticker:${normalizedSymbol}`;

    const cached = await this.getCachedValue(cacheKey);
    if (cached) {
      logger.debug(`Returning cached ticker for ${normalizedSymbol}`);
      return JSON.parse(cached);
    }

    try {
      logger.info(`Fetching ticker for ${normalizedSymbol}`);
      const data = await this.makeRequest('/ticker/24hr', { symbol: normalizedSymbol });

      const ticker = {
        symbol: normalizedSymbol,
        lastPrice: parseFloat(data.lastPrice),
        openPrice: parseFloat(data.openPrice),
        highPrice: parseFloat(data.highPrice),
        lowPrice: parseFloat(data.lowPrice),
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        volume: parseFloat(data.volume),
        quoteVolume: parseFloat(data.quoteVolume),
        count: parseInt(data.count),
        openTime: data.openTime,
        closeTime: data.closeTime
      };

      await this.setCachedValue(cacheKey, this.cacheTTL.ticker, ticker);

      return ticker;
    } catch (error) {
      logger.error(`Error fetching ticker for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all tickers 24h
   */
  async getAllTickers24h() {
    const cacheKey = 'binance:allTickers24h';

    const cached = await this.getCachedValue(cacheKey);
    if (cached) {
      logger.debug('Returning cached all tickers');
      return JSON.parse(cached);
    }

    try {
      logger.info('Fetching all tickers from Binance');
      const data = await this.makeRequest('/ticker/24hr', {}, 20000);

      const tickers = data.map(t => ({
        symbol: t.symbol,
        lastPrice: parseFloat(t.lastPrice),
        openPrice: parseFloat(t.openPrice),
        highPrice: parseFloat(t.highPrice),
        lowPrice: parseFloat(t.lowPrice),
        priceChange: parseFloat(t.priceChange),
        priceChangePercent: parseFloat(t.priceChangePercent),
        volume: parseFloat(t.volume),
        quoteVolume: parseFloat(t.quoteVolume),
        count: parseInt(t.count),
        openTime: t.openTime,
        closeTime: t.closeTime
      }));

      await this.setCachedValue(cacheKey, this.cacheTTL.ticker, tickers);

      return tickers;
    } catch (error) {
      logger.error('Error fetching all tickers:', error.message);
      throw error;
    }
  }

  /**
   * Get candlestick (klines) data
   */
  async getKlines(symbol, interval = '1h', limit = 100, startTime = null, endTime = null) {
    const normalizedSymbol = symbol.toUpperCase();
    const cacheKey = `binance:klines:${normalizedSymbol}:${interval}:${limit}`;

    const cached = await this.getCachedValue(cacheKey);
    if (cached) {
      logger.debug(`Returning cached klines for ${normalizedSymbol}`);
      return JSON.parse(cached);
    }

    try {
      logger.info(`Fetching klines for ${normalizedSymbol}`);
      const params = {
        symbol: normalizedSymbol,
        interval,
        limit
      };

      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;

      const data = await this.makeRequest('/klines', params);

      const klines = data.map(k => ({
        openTime: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        closeTime: k[6],
        quoteVolume: parseFloat(k[7]),
        trades: parseInt(k[8]),
        takerBuyBaseVolume: parseFloat(k[9]),
        takerBuyQuoteVolume: parseFloat(k[10])
      }));

      await this.setCachedValue(cacheKey, this.cacheTTL.klines, klines);

      return klines;
    } catch (error) {
      logger.error(`Error fetching klines for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get latest price for a symbol
   */
  async getLatestPrice(symbol) {
    const normalizedSymbol = symbol.toUpperCase();
    const cacheKey = `binance:price:${normalizedSymbol}`;

    const cached = await this.getCachedValue(cacheKey);
    if (cached) {
      logger.debug(`Returning cached price for ${normalizedSymbol}`);
      return JSON.parse(cached);
    }

    try {
      logger.info(`Fetching latest price for ${normalizedSymbol}`);
      const data = await this.makeRequest('/ticker/price', { symbol: normalizedSymbol });

      const priceData = {
        symbol: normalizedSymbol,
        price: parseFloat(data.price)
      };

      await this.setCachedValue(cacheKey, this.cacheTTL.price, priceData);

      return priceData;
    } catch (error) {
      logger.error(`Error fetching price for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol, limit = 20, forceRefresh = false) {
    const normalizedSymbol = symbol.toUpperCase();
    const cacheKey = `binance:orderbook:${normalizedSymbol}:${limit}`;

    if (!forceRefresh) {
      const cached = await this.getCachedValue(cacheKey);
      if (cached) {
        logger.debug(`Returning cached order book for ${normalizedSymbol}`);
        return JSON.parse(cached);
      }
    }

    try {
      logger.info(`Fetching order book for ${normalizedSymbol}`);
      const data = await this.makeRequest('/depth', { symbol: normalizedSymbol, limit });

      const orderBook = {
        symbol: normalizedSymbol,
        bids: data.bids.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        })),
        asks: data.asks.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        })),
        lastUpdateId: data.lastUpdateId
      };

      await this.setCachedValue(cacheKey, 5, orderBook);

      return orderBook;
    } catch (error) {
      logger.error(`Error fetching order book for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get recent trades for a symbol
   */
  async getRecentTrades(symbol, limit = 50, forceRefresh = false) {
    const normalizedSymbol = symbol.toUpperCase();
    const cacheKey = `binance:trades:${normalizedSymbol}:${limit}`;

    if (!forceRefresh) {
      const cached = await this.getCachedValue(cacheKey);
      if (cached) {
        logger.debug(`Returning cached trades for ${normalizedSymbol}`);
        return JSON.parse(cached);
      }
    }

    try {
      logger.info(`Fetching recent trades for ${normalizedSymbol}`);
      const data = await this.makeRequest('/trades', { symbol: normalizedSymbol, limit });

      const trades = data.map(trade => ({
        id: trade.id,
        price: parseFloat(trade.price),
        quantity: parseFloat(trade.qty),
        quoteQuantity: parseFloat(trade.quoteQty),
        time: trade.time,
        isBuyerMaker: trade.isBuyerMaker
      }));

      await this.setCachedValue(cacheKey, 2, trades);

      return trades;
    } catch (error) {
      logger.error(`Error fetching trades for ${symbol}:`, error.message);
      throw error;
    }
  }
}

let binanceServiceInstance = null;

export const getBinanceService = () => {
  if (!binanceServiceInstance) {
    binanceServiceInstance = new BinanceService();
  }
  return binanceServiceInstance;
};

export default BinanceService;
