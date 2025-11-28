import express from 'express';
import { body } from 'express-validator';
import { authLimiter, apiLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('displayName').optional().isLength({ min: 2, max: 100 }).trim()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const refreshValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
];

// POST /api/auth/register
router.post('/register', authLimiter, registerValidation, authController.register);

// POST /api/auth/login
router.post('/login', authLimiter, loginValidation, authController.login);

// POST /api/auth/refresh
router.post('/refresh', refreshValidation, authController.refresh);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me - Get current user (protected)
router.get('/me', authenticate, authController.getMe);

// PUT /api/auth/profile - Update user profile (protected)
const updateProfileValidation = [
  body('displayName').optional().isLength({ min: 2, max: 100 }).trim(),
  body('bio').optional().isLength({ max: 500 }).trim(),
  body('avatarUrl').optional().isURL().withMessage('Avatar URL must be a valid URL'),
  body('socialLinks').optional().isObject()
];
router.put('/profile', authenticate, updateProfileValidation, authController.updateProfile);

// PUT /api/auth/password - Change password (protected)
const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
];
router.put('/password', authenticate, changePasswordValidation, authController.changePassword);

// GET /api/auth/export - Export user data (protected)
router.get('/export', authenticate, apiLimiter, authController.exportUserData);

// DELETE /api/auth/account - Delete own account (protected)
router.delete('/account', authenticate, [
  body('password').notEmpty().withMessage('Password is required to confirm account deletion')
], authController.deleteAccount);

export default router;

