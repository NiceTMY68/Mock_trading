import express from 'express';
import { body } from 'express-validator';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';
import * as watchlistController from '../controllers/watchlistController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const createWatchlistValidation = [
  body('name').optional().isLength({ min: 1, max: 100 }).trim()
];

const updateWatchlistValidation = [
  body('name').optional().isLength({ min: 1, max: 100 }).trim(),
  body('symbols').optional().isArray(),
  body('orderIndex').optional().isInt({ min: 0 })
];

const addSymbolValidation = [
  body('symbol').notEmpty().withMessage('Symbol is required').isLength({ min: 1, max: 20 })
];

const reorderValidation = [
  body('watchlistIds').isArray().withMessage('watchlistIds must be an array'),
  body('watchlistIds.*').isInt().withMessage('Each watchlist ID must be an integer')
];

// GET /api/watchlists - Get all watchlists for current user
router.get('/', apiLimiter, watchlistController.getWatchlists);

// POST /api/watchlists - Create new watchlist
router.post('/', apiLimiter, createWatchlistValidation, watchlistController.createWatchlist);

// PUT /api/watchlists/:id - Update watchlist
router.put('/:id', apiLimiter, updateWatchlistValidation, watchlistController.updateWatchlist);

// DELETE /api/watchlists/:id - Delete watchlist
router.delete('/:id', apiLimiter, watchlistController.deleteWatchlist);

// POST /api/watchlists/:id/symbols - Add symbol to watchlist
router.post('/:id/symbols', apiLimiter, addSymbolValidation, watchlistController.addSymbol);

// DELETE /api/watchlists/:id/symbols/:symbol - Remove symbol from watchlist
router.delete('/:id/symbols/:symbol', apiLimiter, watchlistController.removeSymbol);

// POST /api/watchlists/reorder - Reorder watchlists
router.post('/reorder', apiLimiter, reorderValidation, watchlistController.reorderWatchlists);

// GET /api/watchlists/symbols - Get all symbols from all user watchlists
router.get('/symbols', apiLimiter, watchlistController.getAllSymbols);

export default router;

