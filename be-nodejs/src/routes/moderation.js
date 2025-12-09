
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import * as moderationController from '../controllers/moderationController.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Moderation Queue
router.get('/queue', moderationController.getModerationQueue);
router.get('/stats', moderationController.getModerationStats);
router.put('/:flagId/approve', moderationController.approveFlag);
router.put('/:flagId/reject', moderationController.rejectFlag);

// Banned Keywords Management
router.get('/keywords', moderationController.getBannedKeywords);
router.post('/keywords', moderationController.addBannedKeyword);
router.put('/keywords/:id', moderationController.updateBannedKeyword);
router.delete('/keywords/:id', moderationController.deleteBannedKeyword);

// Removed Posts History
router.get('/removed-posts', moderationController.getRemovedPosts);

// User Trust Level Management
router.get('/low-trust-users', moderationController.getLowTrustUsers);
router.put('/users/:userId/trust-level', moderationController.updateUserTrustLevel);

export default router;

