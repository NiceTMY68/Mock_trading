import { validationResult } from 'express-validator';
import { PortfolioModel } from '../models/portfolioModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';
import { getBinanceService } from '../services/binanceService.js';

// Helper to get price from Binance
const getBinancePrice = async (symbol) => {
  try {
    const binanceService = getBinanceService();
    const priceData = await binanceService.getLatestPrice(symbol);
    return priceData.price || priceData.lastPrice || 0;
  } catch (error) {
    logger.warn(`Failed to get price for ${symbol}:`, error.message);
    return 0;
  }
};

/**
 * Get portfolio for current user
 * GET /api/portfolio
 */
export const getPortfolio = async (req, res) => {
  try {
    const userId = req.user.userId;
    const portfolio = await PortfolioModel.getOrCreate(userId);

    if (!portfolio) {
      return res.status(404).json(createResponse(false, 'Portfolio not found'));
    }

    // Get current prices for all holdings
    const holdings = portfolio.holdings || [];
    const symbols = holdings.map(h => h.symbol);
    const currentPrices = {};

    if (symbols.length > 0) {
      try {
        // Fetch current prices from Binance
        const pricePromises = symbols.map(async (symbol) => {
          try {
            const price = await getBinancePrice(symbol);
            return { symbol, price: parseFloat(price) };
          } catch (error) {
            logger.warn(`Failed to fetch price for ${symbol}:`, error.message);
            return { symbol, price: null };
          }
        });

        const prices = await Promise.all(pricePromises);
        prices.forEach(({ symbol, price }) => {
          if (price !== null) {
            currentPrices[symbol] = price;
          }
        });
      } catch (error) {
        logger.error('Error fetching prices:', error);
      }
    }

    // Calculate totals with current prices
    const updatedPortfolio = await PortfolioModel.calculateTotals(userId, currentPrices);

    // Format holdings with current prices and PnL
    const formattedHoldings = (updatedPortfolio.holdings || []).map(holding => {
      const currentPrice = currentPrices[holding.symbol] || holding.currentPrice || 0;
      const quantity = holding.quantity || 0;
      const avgPrice = holding.avgPrice || 0;

      const currentValue = quantity * currentPrice;
      const costBasis = quantity * avgPrice;
      const pnl = currentValue - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

      return {
        ...holding,
        currentPrice,
        currentValue,
        costBasis,
        pnl,
        pnlPercent
      };
    });

    res.json(createResponse(true, 'Portfolio retrieved', {
      portfolio: {
        id: updatedPortfolio.id,
        holdings: formattedHoldings,
        totalValueUsd: updatedPortfolio.total_value_usd,
        totalCostBasis: updatedPortfolio.total_cost_basis,
        totalPnl: updatedPortfolio.total_pnl,
        totalPnlPercent: updatedPortfolio.total_pnl_percent,
        updatedAt: updatedPortfolio.updated_at
      }
    }));
  } catch (error) {
    logger.error('Get portfolio error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Add or update holding
 * POST /api/portfolio/holdings
 */
export const addHolding = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { symbol, quantity, avgPrice, notes } = req.body;

    if (!symbol || !quantity || !avgPrice) {
      return res.status(400).json(createResponse(false, 'Symbol, quantity, and avgPrice are required'));
    }

    // Get current price
    let currentPrice = 0;
    try {
      currentPrice = parseFloat(await getBinancePrice(symbol));
    } catch (error) {
      logger.warn(`Failed to fetch price for ${symbol}:`, error.message);
    }

    const holding = {
      symbol: symbol.toUpperCase(),
      quantity: parseFloat(quantity),
      avgPrice: parseFloat(avgPrice),
      currentPrice,
      notes: notes || null,
      addedAt: new Date().toISOString()
    };

    const portfolio = await PortfolioModel.addHolding(userId, holding);
    
    // Recalculate totals
    const currentPrices = { [holding.symbol]: currentPrice };
    await PortfolioModel.calculateTotals(userId, currentPrices);

    logger.info(`Holding added: ${holding.symbol} for user ${userId}`);

    res.status(201).json(createResponse(true, 'Holding added', {
      holding: portfolio.holdings.find(h => h.symbol === holding.symbol)
    }));
  } catch (error) {
    logger.error('Add holding error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Update holding
 * PUT /api/portfolio/holdings/:symbol
 */
export const updateHolding = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { symbol } = req.params;
    const { quantity, avgPrice, notes } = req.body;

    const portfolio = await PortfolioModel.getOrCreate(userId);
    const holdings = portfolio.holdings || [];
    const holdingIndex = holdings.findIndex(h => h.symbol.toUpperCase() === symbol.toUpperCase());

    if (holdingIndex === -1) {
      return res.status(404).json(createResponse(false, 'Holding not found'));
    }

    const updatedHolding = {
      ...holdings[holdingIndex],
      ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
      ...(avgPrice !== undefined && { avgPrice: parseFloat(avgPrice) }),
      ...(notes !== undefined && { notes })
    };

    const updatedPortfolio = await PortfolioModel.addHolding(userId, updatedHolding);
    
    // Recalculate totals
    let currentPrice = 0;
    try {
      currentPrice = parseFloat(await getBinancePrice(symbol));
    } catch (error) {
      logger.warn(`Failed to fetch price for ${symbol}:`, error.message);
    }
    
    const currentPrices = { [symbol.toUpperCase()]: currentPrice };
    await PortfolioModel.calculateTotals(userId, currentPrices);

    res.json(createResponse(true, 'Holding updated', {
      holding: updatedPortfolio.holdings.find(h => h.symbol.toUpperCase() === symbol.toUpperCase())
    }));
  } catch (error) {
    logger.error('Update holding error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Remove holding
 * DELETE /api/portfolio/holdings/:symbol
 */
export const removeHolding = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { symbol } = req.params;

    const portfolio = await PortfolioModel.removeHolding(userId, symbol);
    
    // Recalculate totals
    await PortfolioModel.calculateTotals(userId, {});

    logger.info(`Holding removed: ${symbol} for user ${userId}`);

    res.json(createResponse(true, 'Holding removed', {
      portfolio: {
        holdings: portfolio.holdings || [],
        totalValueUsd: portfolio.total_value_usd,
        totalCostBasis: portfolio.total_cost_basis,
        totalPnl: portfolio.total_pnl,
        totalPnlPercent: portfolio.total_pnl_percent
      }
    }));
  } catch (error) {
    logger.error('Remove holding error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get portfolio summary/stats
 * GET /api/portfolio/summary
 */
export const getSummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const portfolio = await PortfolioModel.getOrCreate(userId);

    const holdings = portfolio.holdings || [];
    const symbols = holdings.map(h => h.symbol);
    const currentPrices = {};

    if (symbols.length > 0) {
      try {
        const pricePromises = symbols.map(async (symbol) => {
          try {
            const price = await getBinancePrice(symbol);
            return { symbol, price: parseFloat(price) };
          } catch (error) {
            return { symbol, price: null };
          }
        });

        const prices = await Promise.all(pricePromises);
        prices.forEach(({ symbol, price }) => {
          if (price !== null) {
            currentPrices[symbol] = price;
          }
        });
      } catch (error) {
        logger.error('Error fetching prices:', error);
      }
    }

    const updatedPortfolio = await PortfolioModel.calculateTotals(userId, currentPrices);

    // Calculate additional stats
    const topGainers = holdings
      .map(h => {
        const currentPrice = currentPrices[h.symbol] || h.currentPrice || 0;
        const pnl = (currentPrice - (h.avgPrice || 0)) * (h.quantity || 0);
        const pnlPercent = h.avgPrice > 0 ? ((currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0;
        return { ...h, pnl, pnlPercent, currentPrice };
      })
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);

    const topLosers = holdings
      .map(h => {
        const currentPrice = currentPrices[h.symbol] || h.currentPrice || 0;
        const pnl = (currentPrice - (h.avgPrice || 0)) * (h.quantity || 0);
        const pnlPercent = h.avgPrice > 0 ? ((currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0;
        return { ...h, pnl, pnlPercent, currentPrice };
      })
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, 5);

    res.json(createResponse(true, 'Portfolio summary retrieved', {
      summary: {
        totalValueUsd: updatedPortfolio.total_value_usd,
        totalCostBasis: updatedPortfolio.total_cost_basis,
        totalPnl: updatedPortfolio.total_pnl,
        totalPnlPercent: updatedPortfolio.total_pnl_percent,
        holdingsCount: holdings.length,
        topGainers,
        topLosers
      }
    }));
  } catch (error) {
    logger.error('Get summary error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get portfolio snapshots/history
 * GET /api/portfolio/snapshots
 */
export const getPortfolioSnapshots = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { days = 30 } = req.query;

    const snapshots = await PortfolioModel.getSnapshots(userId, parseInt(days));

    res.json(createResponse(true, 'Portfolio snapshots retrieved', {
      snapshots: snapshots.map(s => ({
        id: s.id,
        totalValue: parseFloat(s.total_value),
        dailyChange: s.daily_change ? parseFloat(s.daily_change) : null,
        dailyChangePercent: s.daily_change_percent ? parseFloat(s.daily_change_percent) : null,
        snapshotData: typeof s.snapshot_data === 'string' ? JSON.parse(s.snapshot_data) : s.snapshot_data,
        createdAt: s.created_at
      }))
    }));
  } catch (error) {
    logger.error('Get portfolio snapshots error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Create portfolio snapshot (called periodically or manually)
 * POST /api/portfolio/snapshots
 */
export const createPortfolioSnapshot = async (req, res) => {
  try {
    const userId = req.user.userId;
    const portfolio = await PortfolioModel.getOrCreate(userId);
    
    // Get previous snapshot for daily change calculation
    const previousSnapshots = await PortfolioModel.getSnapshots(userId, 1);
    const previousSnapshot = previousSnapshots.length > 0 ? previousSnapshots[previousSnapshots.length - 1] : null;
    
    const totalValue = parseFloat(portfolio.total_value_usd || 0);
    const previousValue = previousSnapshot ? parseFloat(previousSnapshot.total_value) : totalValue;
    const dailyChange = totalValue - previousValue;
    const dailyChangePercent = previousValue > 0 ? (dailyChange / previousValue) * 100 : 0;
    
    const snapshot = await PortfolioModel.createSnapshot(userId, {
      totalValue,
      dailyChange,
      dailyChangePercent,
      snapshotData: {
        holdings: portfolio.holdings || [],
        totalCostBasis: parseFloat(portfolio.total_cost_basis || 0),
        totalPnl: parseFloat(portfolio.total_pnl || 0),
        totalPnlPercent: parseFloat(portfolio.total_pnl_percent || 0)
      }
    });

    res.json(createResponse(true, 'Portfolio snapshot created', {
      snapshot: {
        id: snapshot.id,
        totalValue: parseFloat(snapshot.total_value),
        dailyChange: snapshot.daily_change ? parseFloat(snapshot.daily_change) : null,
        dailyChangePercent: snapshot.daily_change_percent ? parseFloat(snapshot.daily_change_percent) : null,
        createdAt: snapshot.created_at
      }
    }));
  } catch (error) {
    logger.error('Create portfolio snapshot error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

