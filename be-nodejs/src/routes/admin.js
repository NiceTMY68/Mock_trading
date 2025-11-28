import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { body } from 'express-validator';
import * as adminController from '../controllers/adminController.js';
import * as reportController from '../controllers/reportController.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', apiLimiter, adminController.getDashboardStats);

// User Management
router.get('/users', apiLimiter, adminController.getAllUsers);
router.get('/users/:id', apiLimiter, adminController.getUserDetails);
router.put('/users/:id', apiLimiter, [
  body('displayName').optional().isLength({ min: 2, max: 100 }),
  body('role').optional().isIn(['user', 'admin']),
  body('isActive').optional().isBoolean()
], adminController.updateUser);
router.post('/users/:id/logout', apiLimiter, adminController.forceLogoutUser);
router.delete('/users/:id', apiLimiter, adminController.deleteUser);

// Post Moderation
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

// Comment Moderation
router.delete('/comments/:id', apiLimiter, adminController.deleteComment);

// Reports (already have routes in reports.js, but we can add admin-specific ones here if needed)
// Reports are already handled in /api/reports

// System Logs
router.get('/logs', apiLimiter, adminController.getSystemLogs);
router.get('/logs/stats', apiLimiter, adminController.getLogStats);

// Cache Management
router.post('/cache/invalidate', apiLimiter, [
  body('pattern').optional().isString()
], adminController.invalidateCache);
router.get('/cache/stats', apiLimiter, adminController.getCacheStats);

// Alerts Management (Admin view all)
router.get('/alerts', apiLimiter, adminController.getAllAlerts);

// Security Audit
router.get('/security/failed-logins', apiLimiter, adminController.getFailedLogins);
router.get('/security/stats', apiLimiter, adminController.getSecurityStats);

// Announcements Management
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

