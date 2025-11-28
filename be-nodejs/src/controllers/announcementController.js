import { AnnouncementModel } from '../models/announcementModel.js';
import { logger } from '../utils/logger.js';
import { createResponse, paginatedResponse } from '../utils/response.js';

/**
 * Get active announcements (public)
 * GET /api/announcements
 */
export const getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await AnnouncementModel.findActive();
    res.json(createResponse(true, 'Active announcements retrieved', { announcements }));
  } catch (error) {
    logger.error('Get active announcements error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get all announcements (admin only)
 * GET /api/admin/announcements
 */
export const getAllAnnouncements = async (req, res) => {
  try {
    const { page = 0, size = 20, isActive, type } = req.query;
    
    const result = await AnnouncementModel.findMany({
      page: parseInt(page),
      size: parseInt(size),
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : null,
      type: type || null
    });

    paginatedResponse(res, result.items, parseInt(page), parseInt(size), result.total);
  } catch (error) {
    logger.error('Get all announcements error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Create announcement (admin only)
 * POST /api/admin/announcements
 */
export const createAnnouncement = async (req, res) => {
  try {
    const { title, content, type = 'info', priority = 'normal', startsAt, endsAt } = req.body;

    if (!title || !content) {
      return res.status(400).json(createResponse(false, 'Title and content are required'));
    }

    const announcement = await AnnouncementModel.create({
      title,
      content,
      type,
      priority,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      endsAt: endsAt ? new Date(endsAt) : null,
      createdBy: req.user.userId
    });

    logger.info(`Announcement created: ${announcement.id} by admin ${req.user.userId}`);

    res.status(201).json(createResponse(true, 'Announcement created', { announcement }));
  } catch (error) {
    logger.error('Create announcement error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Update announcement (admin only)
 * PUT /api/admin/announcements/:id
 */
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, priority, isActive, startsAt, endsAt } = req.body;

    const announcement = await AnnouncementModel.findById(parseInt(id));
    if (!announcement) {
      return res.status(404).json(createResponse(false, 'Announcement not found'));
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (type !== undefined) updates.type = type;
    if (priority !== undefined) updates.priority = priority;
    if (isActive !== undefined) updates.isActive = isActive;
    if (startsAt !== undefined) updates.startsAt = new Date(startsAt);
    if (endsAt !== undefined) updates.endsAt = endsAt ? new Date(endsAt) : null;

    const updated = await AnnouncementModel.update(parseInt(id), updates);

    logger.info(`Announcement updated: ${id} by admin ${req.user.userId}`);

    res.json(createResponse(true, 'Announcement updated', { announcement: updated }));
  } catch (error) {
    logger.error('Update announcement error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Delete announcement (admin only)
 * DELETE /api/admin/announcements/:id
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await AnnouncementModel.findById(parseInt(id));
    if (!announcement) {
      return res.status(404).json(createResponse(false, 'Announcement not found'));
    }

    await AnnouncementModel.delete(parseInt(id));

    logger.info(`Announcement deleted: ${id} by admin ${req.user.userId}`);

    res.json(createResponse(true, 'Announcement deleted'));
  } catch (error) {
    logger.error('Delete announcement error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

