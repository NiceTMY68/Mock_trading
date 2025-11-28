import express from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';
import * as announcementController from '../controllers/announcementController.js';

const router = express.Router();

// Public: Get active announcements
router.get('/', apiLimiter, announcementController.getActiveAnnouncements);

export default router;

