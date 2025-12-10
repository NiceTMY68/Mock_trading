import { ReportModel } from '../models/reportModel.js';
import { PostModel } from '../models/postModel.js';
import { CommentModel } from '../models/commentModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Create a report
 * POST /api/reports
 */
export const createReport = async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { targetType, targetId, reason } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json(createResponse(false, 'Missing required fields'));
    }

    const validTypes = ['post', 'comment', 'user'];
    if (!validTypes.includes(targetType)) {
      return res.status(400).json(createResponse(false, 'Invalid target type'));
    }

    // Validate that user cannot report their own content
    let targetUserId = null;
    
    if (targetType === 'post') {
      const post = await PostModel.findById(parseInt(targetId));
      if (!post) {
        return res.status(404).json(createResponse(false, 'Post not found'));
      }
      targetUserId = post.user_id;
    } else if (targetType === 'comment') {
      const comment = await CommentModel.findById(parseInt(targetId));
      if (!comment) {
        return res.status(404).json(createResponse(false, 'Comment not found'));
      }
      targetUserId = comment.user_id;
    } else if (targetType === 'user') {
      targetUserId = parseInt(targetId);
    }

    // Check if user is trying to report their own content
    if (targetUserId && targetUserId === reporterId) {
      return res.status(400).json(createResponse(false, 'You cannot report your own content. You can delete it instead.'));
    }

    const report = await ReportModel.create({
      reporterId,
      targetType,
      targetId: parseInt(targetId),
      reason
    });

    res.json(createResponse(true, 'Report submitted', { report }));
  } catch (error) {
    logger.error('Create report error:', error);
    if (error.message === 'You have already reported this item') {
      return res.status(400).json(createResponse(false, error.message));
    }
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get all reports (admin only)
 * GET /api/reports
 */
export const getReports = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const reports = await ReportModel.findAll({
      status: status || null,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(createResponse(true, 'Reports retrieved', { reports }));
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Update report status (admin only)
 * PUT /api/reports/:id/status
 */
export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.userId;

    if (!status) {
      return res.status(400).json(createResponse(false, 'Status is required'));
    }

    const report = await ReportModel.updateStatus(parseInt(id), status, adminId);

    res.json(createResponse(true, 'Report status updated', { report }));
  } catch (error) {
    logger.error('Update report status error:', error);
    if (error.message === 'Invalid status') {
      return res.status(400).json(createResponse(false, error.message));
    }
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

