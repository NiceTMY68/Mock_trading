import { ActivityModel } from '../models/activityModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Get recent activity for current user
 * GET /api/activity
 */
export const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, offset = 0 } = req.query;

    const activities = await ActivityModel.getRecentActivity(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(createResponse(true, 'Recent activity retrieved', { activities }));
  } catch (error) {
    logger.error('Get recent activity error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

