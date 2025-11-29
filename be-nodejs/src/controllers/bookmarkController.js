/**
 * Bookmark Controller
 * 
 * Handles bookmark/save post operations
 */

import { BookmarkModel } from '../models/bookmarkModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Add bookmark
 * POST /api/bookmarks
 */
export const addBookmark = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId, collection = 'default' } = req.body;

    if (!postId) {
      return res.status(400).json(createResponse(false, 'Post ID is required'));
    }

    const bookmark = await BookmarkModel.add(userId, parseInt(postId), collection);
    
    logger.info(`User ${userId} bookmarked post ${postId}`);
    res.status(201).json(createResponse(true, 'Post bookmarked', { bookmark }));
  } catch (error) {
    logger.error('Add bookmark error:', error);
    res.status(500).json(createResponse(false, 'Failed to bookmark post'));
  }
};

/**
 * Remove bookmark
 * DELETE /api/bookmarks/:postId
 */
export const removeBookmark = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;

    const bookmark = await BookmarkModel.remove(userId, parseInt(postId));
    
    if (!bookmark) {
      return res.status(404).json(createResponse(false, 'Bookmark not found'));
    }

    logger.info(`User ${userId} removed bookmark for post ${postId}`);
    res.json(createResponse(true, 'Bookmark removed'));
  } catch (error) {
    logger.error('Remove bookmark error:', error);
    res.status(500).json(createResponse(false, 'Failed to remove bookmark'));
  }
};

/**
 * Check if bookmarked
 * GET /api/bookmarks/check/:postId
 */
export const checkBookmark = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;

    const isBookmarked = await BookmarkModel.isBookmarked(userId, parseInt(postId));
    
    res.json(createResponse(true, 'Bookmark status retrieved', { isBookmarked }));
  } catch (error) {
    logger.error('Check bookmark error:', error);
    res.status(500).json(createResponse(false, 'Failed to check bookmark status'));
  }
};

/**
 * Get user's bookmarks
 * GET /api/bookmarks
 */
export const getBookmarks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 0, size = 20, collection = null } = req.query;

    const result = await BookmarkModel.getByUserId(userId, {
      page: parseInt(page),
      size: parseInt(size),
      collection
    });

    res.json(createResponse(true, 'Bookmarks retrieved', {
      bookmarks: result.items,
      pagination: {
        page: result.page,
        size: result.size,
        total: result.total
      }
    }));
  } catch (error) {
    logger.error('Get bookmarks error:', error);
    res.status(500).json(createResponse(false, 'Failed to get bookmarks'));
  }
};

/**
 * Get user's collections
 * GET /api/bookmarks/collections
 */
export const getCollections = async (req, res) => {
  try {
    const userId = req.user.userId;
    const collections = await BookmarkModel.getCollections(userId);

    res.json(createResponse(true, 'Collections retrieved', { collections }));
  } catch (error) {
    logger.error('Get collections error:', error);
    res.status(500).json(createResponse(false, 'Failed to get collections'));
  }
};

/**
 * Move bookmark to collection
 * PUT /api/bookmarks/:postId/collection
 */
export const moveToCollection = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;
    const { collection } = req.body;

    if (!collection) {
      return res.status(400).json(createResponse(false, 'Collection name is required'));
    }

    const bookmark = await BookmarkModel.moveToCollection(userId, parseInt(postId), collection);
    
    if (!bookmark) {
      return res.status(404).json(createResponse(false, 'Bookmark not found'));
    }

    res.json(createResponse(true, 'Bookmark moved to collection', { bookmark }));
  } catch (error) {
    logger.error('Move to collection error:', error);
    res.status(500).json(createResponse(false, 'Failed to move bookmark'));
  }
};

