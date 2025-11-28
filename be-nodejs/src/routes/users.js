import express from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';
import * as userController from '../controllers/userController.js';
import * as followController from '../controllers/followController.js';

const router = express.Router();

// GET /api/users/:id - Get public user profile (optional auth)
router.get('/:id', optionalAuth, apiLimiter, userController.getPublicProfile);

// POST /api/users/:id/follow - Follow a user (protected)
router.post('/:id/follow', authenticate, apiLimiter, followController.followUser);

// DELETE /api/users/:id/follow - Unfollow a user (protected)
router.delete('/:id/follow', authenticate, apiLimiter, followController.unfollowUser);

// GET /api/users/:id/follow - Check follow status (protected)
router.get('/:id/follow', authenticate, apiLimiter, followController.checkFollowStatus);

// GET /api/users/:id/followers - Get followers (public)
router.get('/:id/followers', optionalAuth, apiLimiter, followController.getFollowers);

// GET /api/users/:id/following - Get following (public)
router.get('/:id/following', optionalAuth, apiLimiter, followController.getFollowing);

export default router;

