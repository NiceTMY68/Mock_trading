import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import { UserModel } from '../models/userModel.js';
import { RefreshTokenModel } from '../models/refreshTokenModel.js';
import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * Generate JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate refresh token with unique identifier
 */
function generateRefreshToken(userId) {
  // Include user ID and random string to ensure uniqueness
  return jwt.sign(
    { 
      type: 'refresh', 
      userId, 
      jti: crypto.randomUUID() // Unique token ID
    }, 
    JWT_SECRET, 
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const { email, password, displayName } = req.body;
    const emailExists = await UserModel.emailExists(email);
    if (emailExists) {
      return res.status(409).json(createResponse(false, 'Email already registered'));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      email,
      passwordHash,
      displayName: displayName || email.split('@')[0],
      role: 'user'
    });

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await RefreshTokenModel.create(user.id, refreshToken, expiresAt);
    logger.info(`New user registered: ${user.email} (ID: ${user.id})`);

    res.status(201).json(createResponse(true, 'User registered successfully', {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      },
      token,
      refreshToken
    }));
  } catch (error) {
    // Enhanced error logging
    logger.error('Register error - Full details:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      errno: error?.errno,
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage,
      detail: error?.detail,
      hint: error?.hint,
      position: error?.position,
      internalPosition: error?.internalPosition,
      internalQuery: error?.internalQuery,
      where: error?.where,
      schema: error?.schema,
      table: error?.table,
      column: error?.column,
      dataType: error?.dataType,
      constraint: error?.constraint,
      file: error?.file,
      line: error?.line,
      routine: error?.routine,
      requestBody: {
        email: req.body?.email,
        hasPassword: !!req.body?.password,
        hasDisplayName: !!req.body?.displayName
      }
    });
    
    // Log the raw error object for complete context
    logger.error('Register error - Raw error object:', error);
    
    // Return more detailed error in development
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const errorDetails = isDevelopment ? {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint
    } : undefined;

    res.status(500).json(createResponse(false, 'Internal server error', errorDetails));
  }
};

/**
 * Login
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const { email, password } = req.body;

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      // Track failed login attempt
      try {
        const { FailedLoginModel } = await import('../models/failedLoginModel.js');
        await FailedLoginModel.create({
          email,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
          reason: 'User not found'
        });
      } catch (error) {
        logger.warn('Failed to log failed login attempt:', error);
      }
      return res.status(401).json(createResponse(false, 'Invalid email or password'));
    }

    // Check if user is active
    if (!user.is_active) {
      // Track failed login attempt
      try {
        const { FailedLoginModel } = await import('../models/failedLoginModel.js');
        await FailedLoginModel.create({
          email,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
          reason: 'Account deactivated'
        });
      } catch (error) {
        logger.warn('Failed to log failed login attempt:', error);
      }
      return res.status(403).json(createResponse(false, 'Account is deactivated'));
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // Track failed login attempt
      try {
        const { FailedLoginModel } = await import('../models/failedLoginModel.js');
        await FailedLoginModel.create({
          email,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
          reason: 'Invalid password'
        });
      } catch (error) {
        logger.warn('Failed to log failed login attempt:', error);
      }
      return res.status(401).json(createResponse(false, 'Invalid email or password'));
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate tokens
    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await RefreshTokenModel.create(user.id, refreshToken, expiresAt);

    logger.info(`User logged in: ${user.email} (ID: ${user.id})`);

    res.json(createResponse(true, 'Login successful', {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        avatarUrl: user.avatar_url
      },
      token,
      refreshToken
    }));
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Refresh token
 * POST /api/auth/refresh
 */
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json(createResponse(false, 'Refresh token required'));
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (error) {
      return res.status(401).json(createResponse(false, 'Invalid refresh token'));
    }

    // Find token in database
    const tokenRecord = await RefreshTokenModel.findByToken(refreshToken);
    if (!tokenRecord) {
      return res.status(401).json(createResponse(false, 'Refresh token not found or expired'));
    }

    // Get user
    const user = await UserModel.findById(tokenRecord.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json(createResponse(false, 'User not found or inactive'));
    }

    // Generate new tokens
    const newToken = generateToken({ userId: user.id, email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken(user.id);

    // Delete old refresh token
    await RefreshTokenModel.delete(refreshToken);

    // Save new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await RefreshTokenModel.create(user.id, newRefreshToken, expiresAt);

    res.json(createResponse(true, 'Token refreshed', {
      token: newToken,
      refreshToken: newRefreshToken
    }));
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshTokenModel.delete(refreshToken);
    }

    res.json(createResponse(true, 'Logged out successfully'));
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json(createResponse(false, 'User not found'));
    }

    // Get user stats
    const stats = await UserModel.getStats(userId);

    res.json(createResponse(true, 'User retrieved', {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        socialLinks: user.social_links || {},
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        stats
      }
    }));
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { displayName, bio, avatarUrl, socialLinks } = req.body;

    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (socialLinks !== undefined) updates.socialLinks = socialLinks;

    const updatedUser = await UserModel.update(userId, updates);

    if (!updatedUser) {
      return res.status(404).json(createResponse(false, 'User not found'));
    }

    // Get updated stats
    const stats = await UserModel.getStats(userId);

    logger.info(`User profile updated: ${userId}`);

    res.json(createResponse(true, 'Profile updated successfully', {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.display_name,
        role: updatedUser.role,
        avatarUrl: updatedUser.avatar_url,
        bio: updatedUser.bio,
        socialLinks: updatedUser.social_links || {},
        isActive: updatedUser.is_active,
        lastLogin: updatedUser.last_login,
        createdAt: updatedUser.created_at,
        stats
      }
    }));
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Change password
 * PUT /api/auth/password
 */
export const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Get current user with password hash
    const user = await UserModel.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json(createResponse(false, 'User not found'));
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json(createResponse(false, 'Current password is incorrect'));
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await UserModel.update(userId, { passwordHash });

    logger.info(`Password changed for user: ${userId}`);

    res.json(createResponse(true, 'Password changed successfully'));
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Export user data
 * GET /api/auth/export
 */
export const exportUserData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const db = getDatabase();

    // Get all user data
    const [user, posts, comments, watchlists, activity] = await Promise.all([
      UserModel.findById(userId),
      db.query(`SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
      db.query(`SELECT * FROM comments WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
      db.query(`SELECT * FROM watchlists WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
      db.query(`SELECT * FROM user_activity WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [userId])
    ]);

    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        socialLinks: user.social_links,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
      },
      posts: posts.rows,
      comments: comments.rows,
      watchlists: watchlists.rows,
      activity: activity.rows,
      exportedAt: new Date().toISOString()
    };

    logger.info(`User data exported for user: ${userId}`);

    res.json(createResponse(true, 'User data exported', { data: exportData }));
  } catch (error) {
    logger.error('Export user data error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Delete user account (self-delete)
 * DELETE /api/auth/account
 */
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    // Verify password
    const user = await UserModel.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json(createResponse(false, 'User not found'));
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json(createResponse(false, 'Password is incorrect'));
    }

    // Delete user (cascade will handle related data)
    const db = getDatabase();
    await db.query(`DELETE FROM users WHERE id = $1`, [userId]);

    logger.info(`User account deleted: ${userId} (self-delete)`);

    res.json(createResponse(true, 'Account deleted successfully'));
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

