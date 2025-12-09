import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { body } from 'express-validator';
import * as adminController from '../controllers/adminController.js';
import * as reportController from '../controllers/reportController.js';

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/dashboard', apiLimiter, adminController.getDashboardStats);

router.get('/users', apiLimiter, adminController.getAllUsers);
router.get('/users/:id', apiLimiter, adminController.getUserDetails);
router.put('/users/:id', apiLimiter, [
  body('displayName').optional().isLength({ min: 2, max: 100 }),
  body('role').optional().isIn(['user', 'admin']),
  body('isActive').optional().isBoolean()
], adminController.updateUser);
router.post('/users/:id/logout', apiLimiter, adminController.forceLogoutUser);
router.delete('/users/:id', apiLimiter, adminController.deleteUser);

router.get('/posts', apiLimiter, adminController.getPostsForModeration);
router.put('/posts/:id/status', apiLimiter, [
  body('status').isIn(['pending', 'published', 'rejected', 'archived'])
], adminController.updatePostStatus);
router.put('/posts/:id/pin', apiLimiter, [
  body('pinned').isBoolean()
], adminController.togglePinPost);
router.put('/posts/:id/feature', apiLimiter, [
  body('featured').isBoolean()
], adminController.toggleFeaturePost);
router.delete('/posts/:id', apiLimiter, adminController.deletePost);

router.delete('/comments/:id', apiLimiter, adminController.deleteComment);

router.get('/logs', apiLimiter, adminController.getSystemLogs);
router.get('/logs/stats', apiLimiter, adminController.getLogStats);

router.post('/cache/invalidate', apiLimiter, [
  body('pattern').optional().isString()
], adminController.invalidateCache);
router.get('/cache/stats', apiLimiter, adminController.getCacheStats);

router.get('/security/failed-logins', apiLimiter, adminController.getFailedLogins);
router.get('/security/stats', apiLimiter, adminController.getSecurityStats);
router.get('/announcements', apiLimiter, adminController.getAllAnnouncements);
router.post('/announcements', apiLimiter, [
  body('title').notEmpty().isLength({ min: 3, max: 255 }),
  body('content').notEmpty().isLength({ min: 10 }),
  body('type').optional().isIn(['info', 'warning', 'success', 'error']),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
], adminController.createAnnouncement);
router.put('/announcements/:id', apiLimiter, [
  body('title').optional().isLength({ min: 3, max: 255 }),
  body('content').optional().isLength({ min: 10 }),
  body('type').optional().isIn(['info', 'warning', 'success', 'error']),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('isActive').optional().isBoolean()
], adminController.updateAnnouncement);
router.delete('/announcements/:id', apiLimiter, adminController.deleteAnnouncement);

export default router;

