import { getBinanceService } from './binanceService.js';
import { logger } from '../utils/logger.js';

const binanceService = getBinanceService();
const IN_MEMORY_CACHE_TTL = 15 * 1000;

let enrichedCache = {
  data: null,
  expiresAt: 0
};

const sortStrategies = {
  volume: (a, b) => b.quoteVolume - a.quoteVolume,
  count: (a, b) => b.count - a.count,
  gainers: (a, b) => b.priceChangePercent - a.priceChangePercent,
  losers: (a, b) => a.priceChangePercent - b.priceChangePercent,
  priceChange: (a, b) => b.priceChangePercent - a.priceChangePercent,
  trending: (a, b) => {
    const scoreA = getTrendingScore(a);
    const scoreB = getTrendingScore(b);
    return scoreB - scoreA;
  }
};

const getTrendingScore = (ticker) => {
  const absChange = Math.abs(ticker.priceChangePercent || 0);
  const volumeScore = Math.log10((ticker.quoteVolume || 1) + 1);
  const tradeScore = Math.log10((ticker.count || 1) + 1);
  return absChange * (volumeScore + tradeScore);
};

const enrichTickers = async () => {
  if (enrichedCache.data && enrichedCache.expiresAt > Date.now()) {
    return enrichedCache.data;
  }

  const [tickers, symbolMap] = await Promise.all([
    binanceService.getAllTickers24h(),
    binanceService.getSymbolMap()
  ]);

  const enriched = tickers.map((ticker) => {
    const meta = symbolMap[ticker.symbol] || {};
    const estimatedMarketCap = ticker.quoteVolume && ticker.lastPrice 
      ? ticker.quoteVolume * ticker.lastPrice * 0.1
      : null;
    
    return {
      symbol: ticker.symbol,
      lastPrice: ticker.lastPrice,
      openPrice: ticker.openPrice,
      highPrice: ticker.highPrice,
      lowPrice: ticker.lowPrice,
      priceChange: ticker.priceChange,
      priceChangePercent: ticker.priceChangePercent,
      volume: ticker.volume,
      quoteVolume: ticker.quoteVolume,
      count: ticker.count || 0,
      marketCap: estimatedMarketCap,
      openTime: ticker.openTime,
      closeTime: ticker.closeTime,
      baseAsset: meta.baseAsset || null,
      quoteAsset: meta.quoteAsset || null,
      listDate: meta.listDate || null,
      status: meta.status || 'TRADING'
    };
  });

  enrichedCache = {
    data: enriched,
    expiresAt: Date.now() + IN_MEMORY_CACHE_TTL
  };

  return enriched;
};

const sortTickers = (tickers, sortBy = 'volume') => {
  const strategy = sortStrategies[sortBy] || sortStrategies.volume;
  return [...tickers].sort(strategy);
};

export const getTopCoins = async ({ limit = 50, sortBy = 'volume', quote = null } = {}) => {
  const tickers = await enrichTickers();
  let filtered = tickers;

  if (quote) {
    filtered = tickers.filter((item) => item.quoteAsset === quote.toUpperCase());
  }

  const sorted = sortTickers(filtered, sortBy);
  return sorted.slice(0, limit);
};

export const getTrendingCoins = async ({ limit = 50 } = {}) => {
  return getTopCoins({ limit, sortBy: 'trending' });
};

export const getLosers = async ({ limit = 50 } = {}) => {
  return getTopCoins({ limit, sortBy: 'losers' });
};

export const getNewListings = async ({ days = 7, limit = 50 } = {}) => {
  const tickers = await enrichTickers();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const newCoins = tickers
    .filter((item) => item.listDate && item.listDate >= cutoff)
    .sort((a, b) => (b.listDate || 0) - (a.listDate || 0))
    .slice(0, limit);

  return newCoins;
};

export const getMarketOverview = async () => {
  const tickers = await enrichTickers();

  const totalSymbols = tickers.length;
  const totalVolume = tickers.reduce((sum, item) => sum + (item.quoteVolume || 0), 0);
  const totalTrades = tickers.reduce((sum, item) => sum + (item.count || 0), 0);
  const bestPerformers = sortTickers(tickers, 'gainers').slice(0, 5);
  const worstPerformers = sortTickers(tickers, 'losers').slice(0, 5);

  return {
    totalSymbols,
    totalVolume,
    totalTrades,
    bestPerformers,
    worstPerformers,
    timestamp: new Date().toISOString()
  };
};

export const getPaginatedMarketList = async ({
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
} = {}) => {
  const tickers = await enrichTickers();
  let filtered = tickers;

  if (quote) {
    filtered = filtered.filter((item) => item.quoteAsset === quote.toUpperCase());
  }

  if (minMarketCap !== null) {
    filtered = filtered.filter((item) => item.marketCap !== null && item.marketCap >= parseFloat(minMarketCap));
  }
  if (maxMarketCap !== null) {
    filtered = filtered.filter((item) => item.marketCap !== null && item.marketCap <= parseFloat(maxMarketCap));
  }

  if (minVolume !== null) {
    filtered = filtered.filter((item) => item.quoteVolume >= parseFloat(minVolume));
  }
  if (maxVolume !== null) {
    filtered = filtered.filter((item) => item.quoteVolume <= parseFloat(maxVolume));
  }

  if (minTradeCount !== null) {
    filtered = filtered.filter((item) => item.count >= parseInt(minTradeCount));
  }
  if (maxTradeCount !== null) {
    filtered = filtered.filter((item) => item.count <= parseInt(maxTradeCount));
  }

  const sorted = sortTickers(filtered, sortBy);
  const total = sorted.length;
  const start = page * size;
  const end = start + size;
  const items = sorted.slice(start, end);

  return {
    items,
    total
  };
};

export const getQuotes = async () => {
  try {
    const tickers = await enrichTickers();
    const quotesSet = new Set();
    tickers.forEach((item) => {
      if (item.quoteAsset) {
        quotesSet.add(item.quoteAsset);
      }
    });
    return Array.from(quotesSet).sort();
  } catch (error) {
    logger.error('Error gathering quote assets:', error);
    return [];
  }
};

