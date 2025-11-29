/**
 * Block Controller
 * 
 * Handles blocking/unblocking users
 */

import { BlockModel } from '../models/blockModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Block a user
 * POST /api/users/:id/block
 */
export const blockUser = async (req, res) => {
  try {
    const blockerId = req.user.userId;
    const blockedId = parseInt(req.params.id);
    const { reason } = req.body;

    if (blockerId === blockedId) {
      return res.status(400).json(createResponse(false, 'Cannot block yourself'));
    }

    const block = await BlockModel.block(blockerId, blockedId, reason);
    
    if (!block) {
      return res.json(createResponse(true, 'User already blocked'));
    }

    logger.info(`User ${blockerId} blocked user ${blockedId}`);
    res.status(201).json(createResponse(true, 'User blocked', { block }));
  } catch (error) {
    logger.error('Block user error:', error);
    res.status(500).json(createResponse(false, error.message || 'Failed to block user'));
  }
};

/**
 * Unblock a user
 * DELETE /api/users/:id/block
 */
export const unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.userId;
    const blockedId = parseInt(req.params.id);

    const block = await BlockModel.unblock(blockerId, blockedId);
    
    if (!block) {
      return res.status(404).json(createResponse(false, 'Block not found'));
    }

    logger.info(`User ${blockerId} unblocked user ${blockedId}`);
    res.json(createResponse(true, 'User unblocked'));
  } catch (error) {
    logger.error('Unblock user error:', error);
    res.status(500).json(createResponse(false, 'Failed to unblock user'));
  }
};

/**
 * Check if user is blocked
 * GET /api/users/:id/block
 */
export const checkBlock = async (req, res) => {
  try {
    const userId = req.user.userId;
    const targetId = parseInt(req.params.id);

    const isBlocked = await BlockModel.isBlocked(userId, targetId);
    const hasBlockedMe = await BlockModel.isBlocked(targetId, userId);
    
    res.json(createResponse(true, 'Block status retrieved', { 
      isBlocked,
      hasBlockedMe,
      hasBlockRelation: isBlocked || hasBlockedMe
    }));
  } catch (error) {
    logger.error('Check block error:', error);
    res.status(500).json(createResponse(false, 'Failed to check block status'));
  }
};

/**
 * Get blocked users list
 * GET /api/users/blocked
 */
export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 0, size = 20 } = req.query;

    const result = await BlockModel.getBlockedUsers(userId, {
      page: parseInt(page),
      size: parseInt(size)
    });

    res.json(createResponse(true, 'Blocked users retrieved', {
      users: result.items.map(b => ({
        id: b.blocked_id,
        displayName: b.display_name,
        email: b.email,
        avatarUrl: b.avatar_url,
        blockedAt: b.created_at,
        reason: b.reason
      })),
      pagination: {
        page: result.page,
        size: result.size,
        total: result.total
      }
    }));
  } catch (error) {
    logger.error('Get blocked users error:', error);
    res.status(500).json(createResponse(false, 'Failed to get blocked users'));
  }
};

