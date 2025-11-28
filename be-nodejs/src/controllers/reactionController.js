import { ReactionModel } from '../models/reactionModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Toggle reaction on post
 * POST /api/posts/:postId/reactions
 */
export const toggleReaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;
    const { type = 'like' } = req.body;

    // Validate reaction type
    const validTypes = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
    if (!validTypes.includes(type)) {
      return res.status(400).json(createResponse(false, 'Invalid reaction type'));
    }

    const reaction = await ReactionModel.toggle(userId, parseInt(postId), type);

    // Get updated counts
    const counts = await ReactionModel.getCountsByPostId(parseInt(postId));
    const userReaction = await ReactionModel.getUserReaction(userId, parseInt(postId));

    res.json(createResponse(true, reaction ? 'Reaction added' : 'Reaction removed', {
      reaction: userReaction,
      counts
    }));
  } catch (error) {
    logger.error('Toggle reaction error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get reactions for a post
 * GET /api/posts/:postId/reactions
 */
export const getReactions = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.userId || null;

    const reactions = await ReactionModel.findByPostId(parseInt(postId));
    const counts = await ReactionModel.getCountsByPostId(parseInt(postId));
    const userReaction = userId ? await ReactionModel.getUserReaction(userId, parseInt(postId)) : null;

    res.json(createResponse(true, 'Reactions retrieved', {
      reactions,
      counts,
      userReaction
    }));
  } catch (error) {
    logger.error('Get reactions error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

