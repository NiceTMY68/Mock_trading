import { SavedSearchModel } from '../models/savedSearchModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Get saved searches
 * GET /api/saved-searches
 */
export const getSavedSearches = async (req, res) => {
  try {
    const userId = req.user.userId;
    const searches = await SavedSearchModel.findByUserId(userId);
    res.json(createResponse(true, 'Saved searches retrieved', { searches }));
  } catch (error) {
    logger.error('Get saved searches error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Create saved search
 * POST /api/saved-searches
 */
export const createSavedSearch = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, searchType, queryParams } = req.body;

    if (!name || !searchType || !queryParams) {
      return res.status(400).json(createResponse(false, 'Name, searchType, and queryParams are required'));
    }

    const search = await SavedSearchModel.create(userId, {
      name,
      searchType,
      queryParams
    });

    res.status(201).json(createResponse(true, 'Saved search created', { search }));
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json(createResponse(false, 'A saved search with this name already exists'));
    }
    logger.error('Create saved search error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Delete saved search
 * DELETE /api/saved-searches/:id
 */
export const deleteSavedSearch = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const search = await SavedSearchModel.findById(parseInt(id), userId);
    if (!search) {
      return res.status(404).json(createResponse(false, 'Saved search not found'));
    }

    await SavedSearchModel.delete(parseInt(id), userId);

    res.json(createResponse(true, 'Saved search deleted'));
  } catch (error) {
    logger.error('Delete saved search error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

