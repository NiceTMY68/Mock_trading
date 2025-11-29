/**
 * Upload Routes
 */

import express from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { upload } from '../services/uploadService.js';
import * as uploadController from '../controllers/uploadController.js';

const router = express.Router();

// Upload single image (authenticated)
router.post(
  '/image',
  authenticate,
  apiLimiter,
  upload.single('image'),
  uploadController.uploadImage
);

// Upload multiple images (authenticated)
router.post(
  '/images',
  authenticate,
  apiLimiter,
  upload.array('images', 10),
  uploadController.uploadMultipleImages
);

// Upload base64 image - for paste functionality (authenticated)
router.post(
  '/paste',
  authenticate,
  apiLimiter,
  uploadController.uploadBase64
);

// Get user's uploads (authenticated)
router.get('/', authenticate, apiLimiter, uploadController.getUploads);

// Get storage stats (authenticated)
router.get('/stats', authenticate, apiLimiter, uploadController.getStorageStats);

// Get images for a post (public)
router.get('/post/:postId', optionalAuth, apiLimiter, uploadController.getPostImages);

// Delete upload (authenticated)
router.delete('/:id', authenticate, apiLimiter, uploadController.deleteUpload);

export default router;

