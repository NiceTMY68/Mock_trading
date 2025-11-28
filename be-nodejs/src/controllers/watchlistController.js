import { validationResult } from 'express-validator';
import { WatchlistModel } from '../models/watchlistModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Get all watchlists for current user
 * GET /api/watchlists
 */
export const getWatchlists = async (req, res) => {
  try {
    const userId = req.user.userId;
    const watchlists = await WatchlistModel.findByUserId(userId);

    res.json(createResponse(true, 'Watchlists retrieved', {
      watchlists: watchlists.map(w => ({
        id: w.id,
        name: w.name,
        symbols: w.symbols || [],
        orderIndex: w.order_index,
        createdAt: w.created_at,
        updatedAt: w.updated_at
      }))
    }));
  } catch (error) {
    logger.error('Get watchlists error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Create new watchlist
 * POST /api/watchlists
 */
export const createWatchlist = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { name } = req.body;

    const watchlist = await WatchlistModel.create(userId, name || 'My Watchlist');

    logger.info(`Watchlist created: ${watchlist.id} for user ${userId}`);

    res.status(201).json(createResponse(true, 'Watchlist created', {
      watchlist: {
        id: watchlist.id,
        name: watchlist.name,
        symbols: watchlist.symbols || [],
        orderIndex: watchlist.order_index,
        createdAt: watchlist.created_at
      }
    }));
  } catch (error) {
    logger.error('Create watchlist error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Update watchlist
 * PUT /api/watchlists/:id
 */
export const updateWatchlist = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { id } = req.params;
    const { name, symbols, orderIndex } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (symbols !== undefined) updates.symbols = symbols;
    if (orderIndex !== undefined) updates.orderIndex = orderIndex;

    const watchlist = await WatchlistModel.update(id, userId, updates);

    if (!watchlist) {
      return res.status(404).json(createResponse(false, 'Watchlist not found'));
    }

    res.json(createResponse(true, 'Watchlist updated', {
      watchlist: {
        id: watchlist.id,
        name: watchlist.name,
        symbols: watchlist.symbols || [],
        orderIndex: watchlist.order_index,
        updatedAt: watchlist.updated_at
      }
    }));
  } catch (error) {
    logger.error('Update watchlist error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Delete watchlist
 * DELETE /api/watchlists/:id
 */
export const deleteWatchlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const watchlist = await WatchlistModel.delete(id, userId);

    if (!watchlist) {
      return res.status(404).json(createResponse(false, 'Watchlist not found'));
    }

    logger.info(`Watchlist deleted: ${id} by user ${userId}`);

    res.json(createResponse(true, 'Watchlist deleted'));
  } catch (error) {
    logger.error('Delete watchlist error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Add symbol to watchlist
 * POST /api/watchlists/:id/symbols
 */
export const addSymbol = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { id } = req.params;
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json(createResponse(false, 'Symbol is required'));
    }

    const watchlist = await WatchlistModel.addSymbol(id, userId, symbol);

    if (!watchlist) {
      return res.status(404).json(createResponse(false, 'Watchlist not found'));
    }

    res.json(createResponse(true, 'Symbol added to watchlist', {
      watchlist: {
        id: watchlist.id,
        symbols: watchlist.symbols || []
      }
    }));
  } catch (error) {
    logger.error('Add symbol error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Remove symbol from watchlist
 * DELETE /api/watchlists/:id/symbols/:symbol
 */
export const removeSymbol = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id, symbol } = req.params;

    const watchlist = await WatchlistModel.removeSymbol(id, userId, symbol);

    if (!watchlist) {
      return res.status(404).json(createResponse(false, 'Watchlist not found'));
    }

    res.json(createResponse(true, 'Symbol removed from watchlist', {
      watchlist: {
        id: watchlist.id,
        symbols: watchlist.symbols || []
      }
    }));
  } catch (error) {
    logger.error('Remove symbol error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Reorder watchlists
 * POST /api/watchlists/reorder
 */
export const reorderWatchlists = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { watchlistIds } = req.body;

    if (!Array.isArray(watchlistIds)) {
      return res.status(400).json(createResponse(false, 'watchlistIds must be an array'));
    }

    const watchlists = await WatchlistModel.reorder(userId, watchlistIds);

    res.json(createResponse(true, 'Watchlists reordered', {
      watchlists: watchlists.map(w => ({
        id: w.id,
        name: w.name,
        orderIndex: w.order_index
      }))
    }));
  } catch (error) {
    logger.error('Reorder watchlists error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get all symbols from all user watchlists
 * GET /api/watchlists/symbols
 */
export const getAllSymbols = async (req, res) => {
  try {
    const userId = req.user.userId;
    const symbols = await WatchlistModel.getAllUserSymbols(userId);

    res.json(createResponse(true, 'Symbols retrieved', { symbols }));
  } catch (error) {
    logger.error('Get all symbols error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

