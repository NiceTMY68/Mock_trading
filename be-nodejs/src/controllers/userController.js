import { UserModel } from '../models/userModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Get public user profile
 * GET /api/users/:id
 */
export const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json(createResponse(false, 'Invalid user ID'));
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json(createResponse(false, 'User not found'));
    }

    // Get user stats
    const stats = await UserModel.getStats(userId);

    // Return public profile (no sensitive data)
    res.json(createResponse(true, 'User profile retrieved', {
      user: {
        id: user.id,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        socialLinks: user.social_links || {},
        createdAt: user.created_at,
        stats: {
          postsCount: stats.postsCount,
          commentsCount: stats.commentsCount
          // Don't expose watchlistsCount and alertsCount for privacy
        }
      }
    }));
  } catch (error) {
    logger.error('Get public profile error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

