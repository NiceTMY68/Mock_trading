import { FollowModel } from '../models/followModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Follow a user
 * POST /api/users/:id/follow
 */
export const followUser = async (req, res) => {
  try {
    const followerId = req.user.userId;
    const { id } = req.params;
    const followingId = parseInt(id);

    if (isNaN(followingId)) {
      return res.status(400).json(createResponse(false, 'Invalid user ID'));
    }

    const follow = await FollowModel.follow(followerId, followingId);
    
    // Get updated counts
    const followerCount = await FollowModel.getFollowerCount(followingId);
    const followingCount = await FollowModel.getFollowingCount(followingId);
    const isFollowing = true;

    res.json(createResponse(true, 'User followed', {
      isFollowing,
      followerCount,
      followingCount
    }));
  } catch (error) {
    logger.error('Follow user error:', error);
    if (error.message === 'Cannot follow yourself') {
      return res.status(400).json(createResponse(false, error.message));
    }
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Unfollow a user
 * DELETE /api/users/:id/follow
 */
export const unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.userId;
    const { id } = req.params;
    const followingId = parseInt(id);

    if (isNaN(followingId)) {
      return res.status(400).json(createResponse(false, 'Invalid user ID'));
    }

    await FollowModel.unfollow(followerId, followingId);
    
    // Get updated counts
    const followerCount = await FollowModel.getFollowerCount(followingId);
    const followingCount = await FollowModel.getFollowingCount(followingId);
    const isFollowing = false;

    res.json(createResponse(true, 'User unfollowed', {
      isFollowing,
      followerCount,
      followingCount
    }));
  } catch (error) {
    logger.error('Unfollow user error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Check if following a user
 * GET /api/users/:id/follow
 */
export const checkFollowStatus = async (req, res) => {
  try {
    const followerId = req.user.userId;
    const { id } = req.params;
    const followingId = parseInt(id);

    if (isNaN(followingId)) {
      return res.status(400).json(createResponse(false, 'Invalid user ID'));
    }

    const isFollowing = await FollowModel.isFollowing(followerId, followingId);
    const followerCount = await FollowModel.getFollowerCount(followingId);
    const followingCount = await FollowModel.getFollowingCount(followingId);

    res.json(createResponse(true, 'Follow status retrieved', {
      isFollowing,
      followerCount,
      followingCount
    }));
  } catch (error) {
    logger.error('Check follow status error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get followers of a user
 * GET /api/users/:id/followers
 */
export const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json(createResponse(false, 'Invalid user ID'));
    }

    const followers = await FollowModel.getFollowers(userId);

    res.json(createResponse(true, 'Followers retrieved', { followers }));
  } catch (error) {
    logger.error('Get followers error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get users that a user is following
 * GET /api/users/:id/following
 */
export const getFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json(createResponse(false, 'Invalid user ID'));
    }

    const following = await FollowModel.getFollowing(userId);

    res.json(createResponse(true, 'Following retrieved', { following }));
  } catch (error) {
    logger.error('Get following error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

