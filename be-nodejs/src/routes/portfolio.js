import express from 'express';
import { body } from 'express-validator';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';
import * as portfolioController from '../controllers/portfolioController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const addHoldingValidation = [
  body('symbol').notEmpty().withMessage('Symbol is required').isLength({ min: 1, max: 20 }),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('avgPrice').isFloat({ min: 0 }).withMessage('Average price must be a positive number'),
  body('notes').optional().isLength({ max: 500 })
];

const updateHoldingValidation = [
  body('quantity').optional().isFloat({ min: 0 }),
  body('avgPrice').optional().isFloat({ min: 0 }),
  body('notes').optional().isLength({ max: 500 })
];

// GET /api/portfolio - Get portfolio
router.get('/', apiLimiter, portfolioController.getPortfolio);

// GET /api/portfolio/summary - Get portfolio summary
router.get('/summary', apiLimiter, portfolioController.getSummary);

// POST /api/portfolio/holdings - Add holding
router.post('/holdings', apiLimiter, addHoldingValidation, portfolioController.addHolding);

// PUT /api/portfolio/holdings/:symbol - Update holding
router.put('/holdings/:symbol', apiLimiter, updateHoldingValidation, portfolioController.updateHolding);

// DELETE /api/portfolio/holdings/:symbol - Remove holding
router.delete('/holdings/:symbol', apiLimiter, portfolioController.removeHolding);

// GET /api/portfolio/snapshots - Get portfolio snapshots
router.get('/snapshots', apiLimiter, portfolioController.getPortfolioSnapshots);

// POST /api/portfolio/snapshots - Create portfolio snapshot
router.post('/snapshots', apiLimiter, portfolioController.createPortfolioSnapshot);

export default router;

