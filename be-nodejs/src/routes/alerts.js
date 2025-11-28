import express from 'express';
import { body } from 'express-validator';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';
import * as alertController from '../controllers/alertController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const createAlertValidation = [
  body('symbol').notEmpty().withMessage('Symbol is required').isLength({ min: 1, max: 20 }),
  body('condition').isIn(['above', 'below', 'percent_change_up', 'percent_change_down']).withMessage('Invalid condition'),
  body('targetValue').isFloat().withMessage('Target value must be a number'),
  body('notes').optional().isLength({ max: 500 })
];

const updateAlertValidation = [
  body('condition').optional().isIn(['above', 'below', 'percent_change_up', 'percent_change_down']),
  body('targetValue').optional().isFloat(),
  body('isActive').optional().isBoolean(),
  body('notes').optional().isLength({ max: 500 })
];

// GET /api/alerts - Get all alerts
router.get('/', apiLimiter, alertController.getAlerts);

// GET /api/alerts/history - Get alert history
router.get('/history', apiLimiter, alertController.getAlertHistory);

// GET /api/alerts/:id - Get alert by ID
router.get('/:id', apiLimiter, alertController.getAlert);

// POST /api/alerts - Create alert
router.post('/', apiLimiter, createAlertValidation, alertController.createAlert);

// PUT /api/alerts/:id - Update alert
router.put('/:id', apiLimiter, updateAlertValidation, alertController.updateAlert);

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', apiLimiter, alertController.deleteAlert);

export default router;

