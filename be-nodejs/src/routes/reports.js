import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { body } from 'express-validator';
import * as reportController from '../controllers/reportController.js';

const router = express.Router();

const createReportValidation = [
  body('targetType').isIn(['post', 'comment', 'user']).withMessage('Invalid target type'),
  body('targetId').isInt().withMessage('Target ID must be an integer'),
  body('reason').notEmpty().withMessage('Reason is required')
];

// POST /api/reports - Create a report (protected)
router.post('/', authenticate, apiLimiter, createReportValidation, reportController.createReport);

// GET /api/reports - Get all reports (admin only)
router.get('/', authenticate, requireAdmin, apiLimiter, reportController.getReports);

// PUT /api/reports/:id/status - Update report status (admin only)
router.put('/:id/status', authenticate, requireAdmin, apiLimiter, reportController.updateReportStatus);

export default router;

