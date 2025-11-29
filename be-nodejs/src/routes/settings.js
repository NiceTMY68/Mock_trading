/**
 * Settings Routes
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import * as notificationSettingsController from '../controllers/notificationSettingsController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Notification Settings
router.get('/notifications', apiLimiter, notificationSettingsController.getSettings);
router.put('/notifications', apiLimiter, notificationSettingsController.updateSettings);
router.post('/notifications/reset', apiLimiter, notificationSettingsController.resetSettings);
router.put('/notifications/email/toggle', apiLimiter, notificationSettingsController.toggleEmail);
router.put('/notifications/push/toggle', apiLimiter, notificationSettingsController.togglePush);

export default router;

