import express from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/notifications - Get notifications
router.get('/', apiLimiter, notificationController.getNotifications);

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', apiLimiter, notificationController.markAsRead);

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', apiLimiter, notificationController.markAllAsRead);

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', apiLimiter, notificationController.deleteNotification);

export default router;

